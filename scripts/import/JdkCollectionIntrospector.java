import com.sun.source.doctree.DeprecatedTree;
import com.sun.source.doctree.DocCommentTree;
import com.sun.source.doctree.DocTree;
import com.sun.source.doctree.ParamTree;
import com.sun.source.doctree.ReturnTree;
import com.sun.source.doctree.SeeTree;
import com.sun.source.doctree.SinceTree;
import com.sun.source.doctree.ThrowsTree;
import com.sun.source.doctree.UnknownBlockTagTree;
import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.DocTrees;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

public final class JdkCollectionIntrospector {
    private enum TypeKind {
        INTERFACE,
        ABSTRACT_CLASS,
        CLASS
    }

    private enum RelationKind {
        EXTENDS,
        IMPLEMENTS
    }

    private enum MemberKind {
        CONSTRUCTOR,
        METHOD
    }

    private record RelationMetadata(String targetClassName, RelationKind kind) {}

    private record DocumentationTagMetadata(String kind, String name, String text) {}

    private record DocumentationMetadata(
        String description,
        List<DocumentationTagMetadata> tags
    ) {}

    private record SourceDocumentationIndex(
        Map<String, DocumentationMetadata> exact,
        Map<String, DocumentationMetadata> uniqueByArity
    ) {
        private DocumentationMetadata find(String name, List<String> parameterTypes) {
            DocumentationMetadata exactMatch = exact.get(memberKey(name, parameterTypes));
            return exactMatch != null
                ? exactMatch
                : uniqueByArity.get(arityKey(name, parameterTypes.size()));
        }
    }

    private record MemberMetadata(
        MemberKind kind,
        String name,
        String signature,
        String visibility,
        boolean staticMember,
        boolean abstractMember,
        boolean defaultMethod,
        boolean finalMember,
        boolean synchronizedMember,
        boolean nativeMember,
        boolean varArgs,
        String returnType,
        List<String> parameterTypes,
        List<String> exceptionTypes,
        DocumentationMetadata documentation
    ) {}

    private record TypeMetadata(
        String className,
        String simpleName,
        TypeKind kind,
        boolean finalType,
        List<MemberMetadata> members,
        List<RelationMetadata> relations
    ) {}

    private static final List<String> TYPE_PACKAGES = List.of(
        "java.util.",
        "java.util.concurrent.",
        "java.lang.",
        "java.io."
    );

    private static final Set<String> ALLOWED_EXTERNAL_TYPES = Set.of(
        "java.lang.Iterable",
        "java.lang.Cloneable",
        "java.io.Serializable"
    );

    private static final JavaCompiler JAVA_COMPILER = ToolProvider.getSystemJavaCompiler();
    private static final List<String> DOCUMENTATION_ERRORS = new ArrayList<>();
    private static FileSystem sourceFileSystem;

    private JdkCollectionIntrospector() {}

    public static void main(String[] arguments) throws IOException {
        if (arguments.length < 2 || !arguments[0].equals("--source-archive")) {
            throw new IllegalArgumentException(
                "Usage: JdkCollectionIntrospector --source-archive <src.zip> <type names...>"
            );
        }
        Path sourceArchive = Path.of(arguments[1]);
        String[] requestedNames = Arrays.copyOfRange(arguments, 2, arguments.length);

        try (FileSystem archive = FileSystems.newFileSystem(sourceArchive, Map.of())) {
            sourceFileSystem = archive;
            writeMetadata(requestedNames);
        }
    }

    private static void writeMetadata(String[] requestedNames) {
        Map<String, Class<?>> discoveredTypes = new LinkedHashMap<>();
        List<String> unresolvedNames = new ArrayList<>();
        Queue<Class<?>> pendingTypes = new ArrayDeque<>();

        for (String requestedName : requestedNames) {
            Class<?> resolved = resolveType(requestedName);
            if (resolved == null) {
                unresolvedNames.add(requestedName);
                continue;
            }
            if (discoveredTypes.putIfAbsent(resolved.getName(), resolved) == null) {
                pendingTypes.add(resolved);
            }
        }

        while (!pendingTypes.isEmpty()) {
            Class<?> current = pendingTypes.remove();
            for (Class<?> relatedType : directRelatedTypes(current)) {
                if (!isCollectionFrameworkType(relatedType)) {
                    continue;
                }
                if (discoveredTypes.putIfAbsent(relatedType.getName(), relatedType) == null) {
                    pendingTypes.add(relatedType);
                }
            }
        }

        List<TypeMetadata> metadata = discoveredTypes.values().stream()
            .map(JdkCollectionIntrospector::describeType)
            .sorted(Comparator.comparing(TypeMetadata::className))
            .toList();

        StringBuilder json = new StringBuilder(512 * 1024);
        json.append('{');
        appendProperty(json, "runtimeVersion", Runtime.version().toString());
        json.append(',');
        appendPropertyName(json, "types");
        appendTypes(json, metadata);
        json.append(',');
        appendPropertyName(json, "unresolvedNames");
        appendStrings(json, unresolvedNames);
        json.append(',');
        appendPropertyName(json, "documentationErrors");
        appendStrings(json, DOCUMENTATION_ERRORS);
        json.append('}');
        System.out.print(json);
    }

    private static Class<?> resolveType(String requestedName) {
        if (requestedName.contains(".")) {
            return loadType(requestedName);
        }
        for (String packageName : TYPE_PACKAGES) {
            Class<?> resolved = loadType(packageName + requestedName);
            if (resolved != null) {
                return resolved;
            }
        }
        return null;
    }

    private static Class<?> loadType(String className) {
        try {
            return Class.forName(className, false, ClassLoader.getPlatformClassLoader());
        } catch (ClassNotFoundException | LinkageError ignored) {
            return null;
        }
    }

    private static List<Class<?>> directRelatedTypes(Class<?> type) {
        List<Class<?>> relatedTypes = new ArrayList<>();
        Class<?> superclass = type.getSuperclass();
        if (superclass != null && superclass != Object.class) {
            relatedTypes.add(superclass);
        }
        relatedTypes.addAll(Arrays.asList(type.getInterfaces()));
        return relatedTypes;
    }

    private static boolean isCollectionFrameworkType(Class<?> type) {
        String className = type.getName();
        return className.startsWith("java.util.")
            || ALLOWED_EXTERNAL_TYPES.contains(className);
    }

    private static TypeMetadata describeType(Class<?> type) {
        SourceDocumentationIndex documentation = readSourceDocumentation(type);
        List<MemberMetadata> members = new ArrayList<>();
        for (Constructor<?> constructor : type.getDeclaredConstructors()) {
            if (!constructor.isSynthetic()) {
                members.add(describeConstructor(constructor, documentation));
            }
        }
        for (Method method : type.getDeclaredMethods()) {
            if (!method.isSynthetic() && !method.isBridge()) {
                members.add(describeMethod(method, documentation));
            }
        }
        members.sort(
            Comparator.comparing((MemberMetadata member) -> member.kind().ordinal())
                .thenComparing(MemberMetadata::name)
                .thenComparing(MemberMetadata::signature)
        );

        List<RelationMetadata> relations = new ArrayList<>();
        Class<?> superclass = type.getSuperclass();
        if (superclass != null && superclass != Object.class && isCollectionFrameworkType(superclass)) {
            relations.add(new RelationMetadata(superclass.getName(), RelationKind.EXTENDS));
        }
        RelationKind interfaceRelation = type.isInterface()
            ? RelationKind.EXTENDS
            : RelationKind.IMPLEMENTS;
        for (Class<?> implementedType : type.getInterfaces()) {
            if (isCollectionFrameworkType(implementedType)) {
                relations.add(new RelationMetadata(implementedType.getName(), interfaceRelation));
            }
        }
        relations.sort(
            Comparator.comparing((RelationMetadata relation) -> relation.kind().ordinal())
                .thenComparing(RelationMetadata::targetClassName)
        );

        return new TypeMetadata(
            type.getName(),
            type.getSimpleName(),
            typeKind(type),
            Modifier.isFinal(type.getModifiers()),
            members,
            relations
        );
    }

    private static TypeKind typeKind(Class<?> type) {
        if (type.isInterface()) {
            return TypeKind.INTERFACE;
        }
        return Modifier.isAbstract(type.getModifiers())
            ? TypeKind.ABSTRACT_CLASS
            : TypeKind.CLASS;
    }

    private static SourceDocumentationIndex readSourceDocumentation(Class<?> type) {
        if (JAVA_COMPILER == null || sourceFileSystem == null) {
            DOCUMENTATION_ERRORS.add(type.getName() + ": JDK compiler or source archive unavailable");
            return emptyDocumentationIndex();
        }

        Path sourcePath = sourceFileSystem.getPath(
            "/java.base/" + type.getName().replace('.', '/') + ".java"
        );
        if (!Files.exists(sourcePath)) {
            DOCUMENTATION_ERRORS.add(type.getName() + ": source file not found");
            return emptyDocumentationIndex();
        }

        try {
            String sourceText = Files.readString(sourcePath, StandardCharsets.UTF_8);
            JavaFileObject sourceObject = new SimpleJavaFileObject(
                URI.create("string:///" + type.getName().replace('.', '/') + ".java"),
                JavaFileObject.Kind.SOURCE
            ) {
                @Override
                public CharSequence getCharContent(boolean ignoreEncodingErrors) {
                    return sourceText;
                }
            };
            JavacTask task = (JavacTask) JAVA_COMPILER.getTask(
                null,
                null,
                null,
                List.of("-proc:none"),
                null,
                List.of(sourceObject)
            );
            CompilationUnitTree unit = task.parse().iterator().next();
            DocTrees docTrees = DocTrees.instance(task);
            ClassTree targetClass = unit.getTypeDecls().stream()
                .filter(tree -> tree instanceof ClassTree)
                .map(tree -> (ClassTree) tree)
                .filter(classTree -> classTree.getSimpleName().contentEquals(type.getSimpleName()))
                .findFirst()
                .orElse(null);
            if (targetClass == null) {
                DOCUMENTATION_ERRORS.add(type.getName() + ": top-level declaration not found");
                return emptyDocumentationIndex();
            }

            TreePath classPath = TreePath.getPath(unit, targetClass);
            Map<String, DocumentationMetadata> exact = new HashMap<>();
            Map<String, DocumentationMetadata> uniqueByArity = new HashMap<>();
            Set<String> ambiguousArityKeys = new java.util.HashSet<>();

            for (Tree member : targetClass.getMembers()) {
                if (!(member instanceof MethodTree methodTree)) {
                    continue;
                }
                TreePath methodPath = new TreePath(classPath, methodTree);
                DocCommentTree docComment = docTrees.getDocCommentTree(methodPath);
                if (docComment == null) {
                    continue;
                }
                String memberName = methodTree.getReturnType() == null
                    ? type.getSimpleName()
                    : methodTree.getName().toString();
                List<String> parameterTypes = methodTree.getParameters().stream()
                    .map(VariableTree::getType)
                    .map(Tree::toString)
                    .toList();
                DocumentationMetadata metadata = describeDocumentation(docComment);
                exact.put(memberKey(memberName, parameterTypes), metadata);

                String arityKey = arityKey(memberName, parameterTypes.size());
                if (uniqueByArity.containsKey(arityKey)) {
                    uniqueByArity.remove(arityKey);
                    ambiguousArityKeys.add(arityKey);
                } else if (!ambiguousArityKeys.contains(arityKey)) {
                    uniqueByArity.put(arityKey, metadata);
                }
            }
            return new SourceDocumentationIndex(exact, uniqueByArity);
        } catch (Exception error) {
            DOCUMENTATION_ERRORS.add(type.getName() + ": " + error.getMessage());
            return emptyDocumentationIndex();
        }
    }

    private static SourceDocumentationIndex emptyDocumentationIndex() {
        return new SourceDocumentationIndex(Map.of(), Map.of());
    }

    private static DocumentationMetadata describeDocumentation(DocCommentTree docComment) {
        List<DocumentationTagMetadata> tags = new ArrayList<>();
        for (DocTree blockTag : docComment.getBlockTags()) {
            DocumentationTagMetadata tag = describeDocumentationTag(blockTag);
            if (tag != null) {
                tags.add(tag);
            }
        }
        return new DocumentationMetadata(
            joinDocTrees(docComment.getFullBody()),
            tags
        );
    }

    private static DocumentationTagMetadata describeDocumentationTag(DocTree blockTag) {
        return switch (blockTag.getKind()) {
            case PARAM -> {
                ParamTree parameter = (ParamTree) blockTag;
                String name = parameter.getName().getName().toString();
                if (parameter.isTypeParameter()) {
                    name = "<" + name + ">";
                }
                yield new DocumentationTagMetadata(
                    "param",
                    name,
                    joinDocTrees(parameter.getDescription())
                );
            }
            case RETURN -> new DocumentationTagMetadata(
                "return",
                "",
                joinDocTrees(((ReturnTree) blockTag).getDescription())
            );
            case THROWS -> {
                ThrowsTree exception = (ThrowsTree) blockTag;
                yield new DocumentationTagMetadata(
                    "throws",
                    exception.getExceptionName().toString(),
                    joinDocTrees(exception.getDescription())
                );
            }
            case SINCE -> new DocumentationTagMetadata(
                "since",
                "",
                joinDocTrees(((SinceTree) blockTag).getBody())
            );
            case SEE -> new DocumentationTagMetadata(
                "see",
                "",
                joinDocTrees(((SeeTree) blockTag).getReference())
            );
            case DEPRECATED -> new DocumentationTagMetadata(
                "deprecated",
                "",
                joinDocTrees(((DeprecatedTree) blockTag).getBody())
            );
            case UNKNOWN_BLOCK_TAG -> {
                UnknownBlockTagTree unknown = (UnknownBlockTagTree) blockTag;
                yield new DocumentationTagMetadata(
                    unknown.getTagName(),
                    "",
                    joinDocTrees(unknown.getContent())
                );
            }
            default -> null;
        };
    }

    private static String joinDocTrees(List<? extends DocTree> trees) {
        StringBuilder text = new StringBuilder();
        for (DocTree tree : trees) {
            text.append(tree);
        }
        return normalizeDocumentationText(text.toString());
    }

    private static String normalizeDocumentationText(String text) {
        return text
            .replace("\r\n", "\n")
            .replace('\r', '\n')
            .replaceAll("[\\t ]+", " ")
            .replaceAll(" *\\n *", "\n")
            .trim();
    }

    private static String memberKey(String name, List<String> parameterTypes) {
        return name + "(" + parameterTypes.stream()
            .map(JdkCollectionIntrospector::normalizeMemberType)
            .reduce((left, right) -> left + "," + right)
            .orElse("") + ")";
    }

    private static String arityKey(String name, int arity) {
        return name + "#" + arity;
    }

    private static String normalizeMemberType(String typeName) {
        String withoutAnnotations = typeName.replaceAll(
            "@[A-Za-z_$][A-Za-z0-9_$.]*(?:\\([^)]*\\))?\\s*",
            ""
        );
        StringBuilder erased = new StringBuilder();
        int genericDepth = 0;
        for (int index = 0; index < withoutAnnotations.length(); index += 1) {
            char character = withoutAnnotations.charAt(index);
            if (character == '<') {
                genericDepth += 1;
            } else if (character == '>') {
                genericDepth = Math.max(0, genericDepth - 1);
            } else if (genericDepth == 0) {
                erased.append(character);
            }
        }
        return erased.toString()
            .replace("...", "[]")
            .replaceAll("\\s+", "")
            .replaceAll("(?:[A-Za-z_$][A-Za-z0-9_$]*\\.)+", "");
    }

    private static MemberMetadata describeConstructor(
        Constructor<?> constructor,
        SourceDocumentationIndex documentation
    ) {
        int modifiers = constructor.getModifiers();
        List<String> parameterTypes = typeNames(
            constructor.getGenericParameterTypes(),
            constructor.isVarArgs()
        );
        return new MemberMetadata(
            MemberKind.CONSTRUCTOR,
            constructor.getDeclaringClass().getSimpleName(),
            formatConstructor(constructor),
            visibility(modifiers),
            false,
            false,
            false,
            false,
            false,
            false,
            constructor.isVarArgs(),
            null,
            parameterTypes,
            typeNames(constructor.getGenericExceptionTypes(), false),
            documentation.find(constructor.getDeclaringClass().getSimpleName(), parameterTypes)
        );
    }

    private static MemberMetadata describeMethod(
        Method method,
        SourceDocumentationIndex documentation
    ) {
        int modifiers = method.getModifiers();
        List<String> parameterTypes = typeNames(
            method.getGenericParameterTypes(),
            method.isVarArgs()
        );
        return new MemberMetadata(
            MemberKind.METHOD,
            method.getName(),
            formatMethod(method),
            visibility(modifiers),
            Modifier.isStatic(modifiers),
            Modifier.isAbstract(modifiers),
            method.isDefault(),
            Modifier.isFinal(modifiers),
            Modifier.isSynchronized(modifiers),
            Modifier.isNative(modifiers),
            method.isVarArgs(),
            typeName(method.getGenericReturnType()),
            parameterTypes,
            typeNames(method.getGenericExceptionTypes(), false),
            documentation.find(method.getName(), parameterTypes)
        );
    }

    private static String formatConstructor(Constructor<?> constructor) {
        StringBuilder signature = new StringBuilder();
        appendModifiers(signature, constructor.getModifiers(), false);
        appendTypeParameters(signature, constructor.getTypeParameters());
        signature.append(constructor.getDeclaringClass().getSimpleName());
        appendParameters(signature, constructor.getGenericParameterTypes(), constructor.isVarArgs());
        appendExceptions(signature, constructor.getGenericExceptionTypes());
        return signature.toString();
    }

    private static String formatMethod(Method method) {
        StringBuilder signature = new StringBuilder();
        appendModifiers(signature, method.getModifiers(), method.isDefault());
        appendTypeParameters(signature, method.getTypeParameters());
        signature.append(typeName(method.getGenericReturnType())).append(' ');
        signature.append(method.getName());
        appendParameters(signature, method.getGenericParameterTypes(), method.isVarArgs());
        appendExceptions(signature, method.getGenericExceptionTypes());
        return signature.toString();
    }

    private static void appendModifiers(StringBuilder signature, int modifiers, boolean defaultMethod) {
        appendModifier(signature, Modifier.isPublic(modifiers), "public");
        appendModifier(signature, Modifier.isProtected(modifiers), "protected");
        appendModifier(signature, Modifier.isPrivate(modifiers), "private");
        appendModifier(signature, Modifier.isAbstract(modifiers), "abstract");
        appendModifier(signature, Modifier.isStatic(modifiers), "static");
        appendModifier(signature, Modifier.isFinal(modifiers), "final");
        appendModifier(signature, Modifier.isSynchronized(modifiers), "synchronized");
        appendModifier(signature, Modifier.isNative(modifiers), "native");
        appendModifier(signature, Modifier.isStrict(modifiers), "strictfp");
        if (defaultMethod) {
            signature.append("default ");
        }
    }

    private static void appendModifier(StringBuilder signature, boolean present, String modifier) {
        if (present) {
            signature.append(modifier).append(' ');
        }
    }

    private static void appendTypeParameters(
        StringBuilder signature,
        TypeVariable<?>[] typeParameters
    ) {
        if (typeParameters.length == 0) {
            return;
        }
        signature.append('<');
        for (int index = 0; index < typeParameters.length; index += 1) {
            if (index > 0) {
                signature.append(", ");
            }
            TypeVariable<?> typeParameter = typeParameters[index];
            signature.append(typeParameter.getName());
            List<String> bounds = Arrays.stream(typeParameter.getBounds())
                .map(JdkCollectionIntrospector::typeName)
                .filter(bound -> !bound.equals("java.lang.Object"))
                .toList();
            if (!bounds.isEmpty()) {
                signature.append(" extends ").append(String.join(" & ", bounds));
            }
        }
        signature.append("> ");
    }

    private static void appendParameters(
        StringBuilder signature,
        Type[] parameterTypes,
        boolean varArgs
    ) {
        signature.append('(');
        List<String> names = typeNames(parameterTypes, varArgs);
        signature.append(String.join(", ", names));
        signature.append(')');
    }

    private static void appendExceptions(StringBuilder signature, Type[] exceptionTypes) {
        List<String> names = typeNames(exceptionTypes, false);
        if (!names.isEmpty()) {
            signature.append(" throws ").append(String.join(", ", names));
        }
    }

    private static List<String> typeNames(Type[] types, boolean varArgs) {
        List<String> names = new ArrayList<>(types.length);
        for (int index = 0; index < types.length; index += 1) {
            String name = typeName(types[index]);
            if (varArgs && index == types.length - 1 && name.endsWith("[]")) {
                name = name.substring(0, name.length() - 2) + "...";
            }
            names.add(name);
        }
        return names;
    }

    private static String typeName(Type type) {
        return type.getTypeName().replace('$', '.');
    }

    private static String visibility(int modifiers) {
        if (Modifier.isPublic(modifiers)) {
            return "public";
        }
        if (Modifier.isProtected(modifiers)) {
            return "protected";
        }
        if (Modifier.isPrivate(modifiers)) {
            return "private";
        }
        return "package-private";
    }

    private static void appendTypes(StringBuilder json, List<TypeMetadata> types) {
        json.append('[');
        for (int index = 0; index < types.size(); index += 1) {
            if (index > 0) {
                json.append(',');
            }
            appendType(json, types.get(index));
        }
        json.append(']');
    }

    private static void appendType(StringBuilder json, TypeMetadata type) {
        json.append('{');
        appendProperty(json, "className", type.className());
        json.append(',');
        appendProperty(json, "simpleName", type.simpleName());
        json.append(',');
        appendProperty(json, "kind", type.kind().name().toLowerCase());
        json.append(',');
        appendProperty(json, "finalType", type.finalType());
        json.append(',');
        appendPropertyName(json, "members");
        appendMembers(json, type.members());
        json.append(',');
        appendPropertyName(json, "relations");
        appendRelations(json, type.relations());
        json.append('}');
    }

    private static void appendMembers(StringBuilder json, List<MemberMetadata> members) {
        json.append('[');
        for (int index = 0; index < members.size(); index += 1) {
            if (index > 0) {
                json.append(',');
            }
            MemberMetadata member = members.get(index);
            json.append('{');
            appendProperty(json, "kind", member.kind().name().toLowerCase());
            json.append(',');
            appendProperty(json, "name", member.name());
            json.append(',');
            appendProperty(json, "signature", member.signature());
            json.append(',');
            appendProperty(json, "visibility", member.visibility());
            json.append(',');
            appendProperty(json, "staticMember", member.staticMember());
            json.append(',');
            appendProperty(json, "abstractMember", member.abstractMember());
            json.append(',');
            appendProperty(json, "defaultMethod", member.defaultMethod());
            json.append(',');
            appendProperty(json, "finalMember", member.finalMember());
            json.append(',');
            appendProperty(json, "synchronizedMember", member.synchronizedMember());
            json.append(',');
            appendProperty(json, "nativeMember", member.nativeMember());
            json.append(',');
            appendProperty(json, "varArgs", member.varArgs());
            json.append(',');
            appendNullableProperty(json, "returnType", member.returnType());
            json.append(',');
            appendPropertyName(json, "parameterTypes");
            appendStrings(json, member.parameterTypes());
            json.append(',');
            appendPropertyName(json, "exceptionTypes");
            appendStrings(json, member.exceptionTypes());
            json.append(',');
            appendPropertyName(json, "documentation");
            appendDocumentation(json, member.documentation());
            json.append('}');
        }
        json.append(']');
    }

    private static void appendDocumentation(
        StringBuilder json,
        DocumentationMetadata documentation
    ) {
        if (documentation == null) {
            json.append("null");
            return;
        }
        json.append('{');
        appendProperty(json, "description", documentation.description());
        json.append(',');
        appendPropertyName(json, "tags");
        json.append('[');
        for (int index = 0; index < documentation.tags().size(); index += 1) {
            if (index > 0) {
                json.append(',');
            }
            DocumentationTagMetadata tag = documentation.tags().get(index);
            json.append('{');
            appendProperty(json, "kind", tag.kind());
            json.append(',');
            appendProperty(json, "name", tag.name());
            json.append(',');
            appendProperty(json, "text", tag.text());
            json.append('}');
        }
        json.append(']');
        json.append('}');
    }

    private static void appendRelations(StringBuilder json, List<RelationMetadata> relations) {
        json.append('[');
        for (int index = 0; index < relations.size(); index += 1) {
            if (index > 0) {
                json.append(',');
            }
            RelationMetadata relation = relations.get(index);
            json.append('{');
            appendProperty(json, "targetClassName", relation.targetClassName());
            json.append(',');
            appendProperty(json, "kind", relation.kind().name().toLowerCase());
            json.append('}');
        }
        json.append(']');
    }

    private static void appendStrings(StringBuilder json, List<String> values) {
        json.append('[');
        for (int index = 0; index < values.size(); index += 1) {
            if (index > 0) {
                json.append(',');
            }
            appendQuoted(json, values.get(index));
        }
        json.append(']');
    }

    private static void appendPropertyName(StringBuilder json, String name) {
        appendQuoted(json, name);
        json.append(':');
    }

    private static void appendProperty(StringBuilder json, String name, String value) {
        appendPropertyName(json, name);
        appendQuoted(json, value);
    }

    private static void appendNullableProperty(StringBuilder json, String name, String value) {
        appendPropertyName(json, name);
        if (value == null) {
            json.append("null");
        } else {
            appendQuoted(json, value);
        }
    }

    private static void appendProperty(StringBuilder json, String name, boolean value) {
        appendPropertyName(json, name);
        json.append(value);
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
                    if (character < 0x20) {
                        json.append(String.format("\\u%04x", (int) character));
                    } else {
                        json.append(character);
                    }
                }
            }
        }
        json.append('"');
    }
}
