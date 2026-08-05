import java.io.IOException;
import java.lang.reflect.RecordComponent;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.tools.Diagnostic;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;

final class JavaSourceSupport {
    private static final int DEFAULT_MAX_FILES = 5_000;
    private static final long MAX_SOURCE_BYTES = 96L * 1024L * 1024L;

    private JavaSourceSupport() {}

    static SourceOptions parseOptions(String[] arguments) {
        Path source = null;
        String prefix = "";
        int maxFiles = DEFAULT_MAX_FILES;
        for (int index = 0; index < arguments.length; index += 1) {
            switch (arguments[index]) {
                case "--source" -> source = Path.of(requireValue(arguments, ++index, "--source"));
                case "--prefix" -> prefix = requireValue(arguments, ++index, "--prefix");
                case "--max-files" -> maxFiles = Integer.parseInt(
                    requireValue(arguments, ++index, "--max-files")
                );
                default -> throw new IllegalArgumentException("Unknown argument: " + arguments[index]);
            }
        }
        if (source == null) {
            throw new IllegalArgumentException("Usage: --source <file-or-directory-or-archive>");
        }
        if (maxFiles < 1 || maxFiles > 20_000) {
            throw new IllegalArgumentException("--max-files must be between 1 and 20000.");
        }
        return new SourceOptions(
            source.toAbsolutePath().normalize(),
            normalizePrefix(prefix),
            maxFiles
        );
    }

    private static String requireValue(String[] arguments, int index, String option) {
        if (index >= arguments.length || arguments[index].isBlank()) {
            throw new IllegalArgumentException("Missing value for " + option);
        }
        return arguments[index];
    }

    private static String normalizePrefix(String prefix) {
        return prefix.replace('\\', '/').replaceAll("^/+|/+$", "");
    }

    static List<SourceUnit> readSources(SourceOptions options) throws IOException {
        if (!Files.exists(options.source())) {
            throw new IllegalArgumentException("Java source path does not exist: " + options.source());
        }
        if (Files.isDirectory(options.source())) {
            Path start = options.prefix().isEmpty()
                ? options.source()
                : options.source().resolve(options.prefix());
            return readSourceTree(start, options.maxFiles());
        }
        if (options.source().getFileName().toString().toLowerCase().endsWith(".java")) {
            return List.of(readSourceFile(options.source(), options.source().getFileName().toString()));
        }
        try (FileSystem archive = FileSystems.newFileSystem(options.source(), Map.of())) {
            Path start = options.prefix().isEmpty()
                ? archive.getPath("/")
                : archive.getPath("/" + options.prefix());
            return readSourceTree(start, options.maxFiles());
        } catch (java.util.zip.ZipException error) {
            throw new IllegalArgumentException(
                "Java source must be a .java file, directory, ZIP, JAR, or JDK src.zip.",
                error
            );
        }
    }

    private static List<SourceUnit> readSourceTree(Path start, int maxFiles) throws IOException {
        if (!Files.exists(start)) {
            throw new IllegalArgumentException("Java source subpath does not exist: " + start);
        }
        List<Path> sourcePaths;
        try (var paths = Files.walk(start)) {
            sourcePaths = paths
                .filter(Files::isRegularFile)
                .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".java"))
                .sorted(Comparator.comparing(Path::toString))
                .limit((long) maxFiles + 1)
                .toList();
        }
        if (sourcePaths.size() > maxFiles) {
            throw new IllegalArgumentException(
                "Selected source contains more than " + maxFiles + " Java files; choose a narrower path."
            );
        }
        List<SourceUnit> sources = new ArrayList<>(sourcePaths.size());
        long totalBytes = 0;
        for (Path sourcePath : sourcePaths) {
            totalBytes += Files.size(sourcePath);
            if (totalBytes > MAX_SOURCE_BYTES) {
                throw new IllegalArgumentException("Selected Java source exceeds the 96 MB limit.");
            }
            sources.add(readSourceFile(sourcePath, start.relativize(sourcePath).toString()));
        }
        return sources;
    }

    private static SourceUnit readSourceFile(Path sourcePath, String displayName) throws IOException {
        return new SourceUnit(
            displayName.replace('\\', '/'),
            Files.readString(sourcePath, StandardCharsets.UTF_8).replace("\r\n", "\n")
        );
    }

    static SimpleJavaFileObject sourceObject(SourceUnit source) {
        String uriPath = source.name().replace(" ", "%20");
        return new SimpleJavaFileObject(
            URI.create("string:///" + uriPath.replaceAll("^/+", "")),
            JavaFileObject.Kind.SOURCE
        ) {
            @Override
            public CharSequence getCharContent(boolean ignoreEncodingErrors) {
                return source.text();
            }
        };
    }

    static String diagnosticText(Diagnostic<? extends JavaFileObject> diagnostic) {
        String file = diagnostic.getSource() == null ? "source" : diagnostic.getSource().getName();
        return file + ":" + diagnostic.getLineNumber() + ": "
            + diagnostic.getMessage(java.util.Locale.ROOT);
    }

    static void writeMetadata(int sourceFiles, List<TypeMetadata> types, List<String> diagnostics) {
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("runtimeVersion", Runtime.version().toString());
        output.put("sourceFiles", sourceFiles);
        output.put("types", types);
        output.put("diagnostics", diagnostics);
        StringBuilder json = new StringBuilder(Math.max(4096, types.size() * 4096));
        appendJson(json, output);
        System.out.print(json);
    }

    private static void appendJson(StringBuilder json, Object value) {
        if (value == null) {
            json.append("null");
        } else if (value instanceof String text) {
            appendQuoted(json, text);
        } else if (value instanceof Number || value instanceof Boolean) {
            json.append(value);
        } else if (value instanceof Enum<?> enumeration) {
            appendQuoted(json, enumeration.name().toLowerCase());
        } else if (value instanceof Map<?, ?> map) {
            json.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) json.append(',');
                first = false;
                appendQuoted(json, String.valueOf(entry.getKey()));
                json.append(':');
                appendJson(json, entry.getValue());
            }
            json.append('}');
        } else if (value instanceof Iterable<?> values) {
            json.append('[');
            boolean first = true;
            for (Object item : values) {
                if (!first) json.append(',');
                first = false;
                appendJson(json, item);
            }
            json.append(']');
        } else if (value.getClass().isRecord()) {
            appendRecord(json, value);
        } else {
            throw new IllegalArgumentException("Unsupported JSON value: " + value.getClass());
        }
    }

    private static void appendRecord(StringBuilder json, Object record) {
        json.append('{');
        RecordComponent[] components = record.getClass().getRecordComponents();
        for (int index = 0; index < components.length; index += 1) {
            if (index > 0) json.append(',');
            RecordComponent component = components[index];
            appendQuoted(json, component.getName());
            json.append(':');
            try {
                appendJson(json, component.getAccessor().invoke(record));
            } catch (ReflectiveOperationException error) {
                throw new IllegalStateException("Cannot serialize Java source metadata", error);
            }
        }
        json.append('}');
    }

    private static void appendQuoted(StringBuilder json, String value) {
        json.append('"');
        for (int index = 0; index < value.length(); index += 1) {
            char character = value.charAt(index);
            switch (character) {
                case '"' -> json.append("\\\"");
                case '\\' -> json.append("\\\\");
                case '\b' -> json.append("\\b");
                case '\f' -> json.append("\\f");
                case '\n' -> json.append("\\n");
                case '\r' -> json.append("\\r");
                case '\t' -> json.append("\\t");
                default -> {
                    if (character < 0x20) json.append(String.format("\\u%04x", (int) character));
                    else json.append(character);
                }
            }
        }
        json.append('"');
    }
}
