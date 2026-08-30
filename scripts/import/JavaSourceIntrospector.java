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
import com.sun.source.tree.ImportTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.TypeParameterTree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.DocTrees;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.lang.model.element.Modifier;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;

public final class JavaSourceIntrospector {
    private static final JavaCompiler JAVA_COMPILER = ToolProvider.getSystemJavaCompiler();

    private JavaSourceIntrospector() {}

    public static void main(String[] arguments) throws IOException {
        SourceOptions options = JavaSourceSupport.parseOptions(arguments);
        if (JAVA_COMPILER == null) {
            throw new IllegalStateException("A full JDK with jdk.compiler is required.");
        }

        List<SourceUnit> sources = JavaSourceSupport.readSources(options);
        if (sources.isEmpty()) {
            throw new IllegalArgumentException("No .java source files were found in the selected path.");
        }

        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        List<JavaFileObject> sourceObjects = sources.stream()
            .map(JavaSourceSupport::sourceObject)
            .map(JavaFileObject.class::cast)
            .toList();
        JavacTask task = (JavacTask) JAVA_COMPILER.getTask(
            null,
            null,
            diagnostics,
            List.of("-proc:none", "-Xlint:none"),
            null,
            sourceObjects
        );
        Iterable<? extends CompilationUnitTree> parsedUnits = task.parse();
        DocTrees docTrees = DocTrees.instance(task);
        List<TypeDraft> drafts = new ArrayList<>();
        for (CompilationUnitTree unit : parsedUnits) {
            collectCompilationUnit(unit, docTrees, drafts);
        }

        List<String> parseErrors = diagnostics.getDiagnostics().stream()
            .filter(diagnostic -> diagnostic.getKind() == Diagnostic.Kind.ERROR)
            .map(JavaSourceSupport::diagnosticText)
            .toList();
        if (!parseErrors.isEmpty()) {
            JavaSourceSupport.writeMetadata(sources.size(), List.of(), parseErrors);
            return;
        }

        List<TypeMetadata> types = resolveTypes(drafts);
        JavaSourceSupport.writeMetadata(sources.size(), types, List.of());
    }

    private static void collectCompilationUnit(
        CompilationUnitTree unit,
        DocTrees docTrees,
        List<TypeDraft> drafts
    ) {
        String packageName = unit.getPackageName() == null ? "" : unit.getPackageName().toString();
        Map<String, String> explicitImports = new HashMap<>();
        List<String> wildcardImports = new ArrayList<>();
        for (ImportTree importTree : unit.getImports()) {
            if (importTree.isStatic()) continue;
            String imported = importTree.getQualifiedIdentifier().toString();
            if (imported.endsWith(".*")) {
                wildcardImports.add(imported.substring(0, imported.length() - 2));
            } else {
                explicitImports.put(simpleName(imported), imported);
            }
        }
        CompilationContext context = new CompilationContext(
            packageName,
            explicitImports,
            wildcardImports
        );
        for (Tree declaration : unit.getTypeDecls()) {
            if (declaration instanceof ClassTree classTree) {
                collectType(unit, docTrees, classTree, context, "", drafts);
            }
        }
    }

    private static void collectType(
        CompilationUnitTree unit,
        DocTrees docTrees,
        ClassTree classTree,
        CompilationContext context,
        String outerName,
        List<TypeDraft> drafts
    ) {
        String simpleName = classTree.getSimpleName().toString();
        if (simpleName.isEmpty()) return;
        String localName = outerName.isEmpty() ? simpleName : outerName + "." + simpleName;
        String className = context.packageName().isEmpty()
            ? localName
            : context.packageName() + "." + localName;
        TypeKind kind = typeKind(classTree);
        TreePath classPath = TreePath.getPath(unit, classTree);
        DocumentationMetadata documentation = describeDocumentation(
            docTrees.getDocCommentTree(classPath)
        );
        List<MemberMetadata> members = new ArrayList<>();
        List<RawRelation> relations = new ArrayList<>();

        if (classTree.getExtendsClause() != null) {
            relations.add(new RawRelation(
                classTree.getExtendsClause().toString(),
                RelationKind.EXTENDS
            ));
        }
        RelationKind interfaceRelation = kind == TypeKind.INTERFACE || kind == TypeKind.ANNOTATION
            ? RelationKind.EXTENDS
            : RelationKind.IMPLEMENTS;
        for (Tree implemented : classTree.getImplementsClause()) {
            relations.add(new RawRelation(implemented.toString(), interfaceRelation));
        }

        for (Tree member : classTree.getMembers()) {
            if (member instanceof MethodTree methodTree) {
                members.add(describeMember(methodTree, classTree, kind, classPath, docTrees));
            }
        }
        members.sort(
            Comparator.comparing((MemberMetadata member) -> member.kind().ordinal())
                .thenComparing(MemberMetadata::name)
                .thenComparing(MemberMetadata::signature)
        );
        drafts.add(new TypeDraft(
            className,
            simpleName,
            context.packageName(),
            unit.getSourceFile().getName().replace('\\', '/'),
            kind,
            isFinalType(classTree, kind),
            documentation,
            members,
            relations,
            context
        ));

        for (Tree member : classTree.getMembers()) {
            if (member instanceof ClassTree nestedType) {
                collectType(unit, docTrees, nestedType, context, localName, drafts);
            }
        }
    }

    private static TypeKind typeKind(ClassTree type) {
        return switch (type.getKind()) {
            case INTERFACE -> TypeKind.INTERFACE;
            case ENUM -> TypeKind.ENUM;
            case RECORD -> TypeKind.RECORD;
            case ANNOTATION_TYPE -> TypeKind.ANNOTATION;
            case CLASS -> type.getModifiers().getFlags().contains(Modifier.ABSTRACT)
                ? TypeKind.ABSTRACT_CLASS
                : TypeKind.CLASS;
            default -> throw new IllegalArgumentException("Unsupported Java type: " + type.getKind());
        };
    }

    private static boolean isFinalType(ClassTree type, TypeKind kind) {
        return type.getModifiers().getFlags().contains(Modifier.FINAL)
            || kind == TypeKind.ENUM
            || kind == TypeKind.RECORD;
    }

    private static MemberMetadata describeMember(
        MethodTree method,
        ClassTree owner,
        TypeKind ownerKind,
        TreePath classPath,
        DocTrees docTrees
    ) {
        Set<Modifier> modifiers = method.getModifiers().getFlags();
        boolean constructor = method.getReturnType() == null;
        boolean interfaceLike = ownerKind == TypeKind.INTERFACE || ownerKind == TypeKind.ANNOTATION;
        boolean staticMember = modifiers.contains(Modifier.STATIC);
        boolean defaultMethod = modifiers.contains(Modifier.DEFAULT);
        boolean privateMember = modifiers.contains(Modifier.PRIVATE);
        boolean abstractMember = modifiers.contains(Modifier.ABSTRACT)
            || (interfaceLike && method.getBody() == null && !staticMember && !defaultMethod && !privateMember);
        boolean varArgs = !method.getParameters().isEmpty()
            && method.getParameters().get(method.getParameters().size() - 1).toString().contains("...");
        List<String> parameterTypes = parameterTypes(method.getParameters(), varArgs);
        List<String> exceptionTypes = method.getThrows().stream().map(Tree::toString).toList();
        String name = constructor ? owner.getSimpleName().toString() : method.getName().toString();
        String returnType = constructor ? null : method.getReturnType().toString();
        String visibility = visibility(modifiers, interfaceLike && !constructor);
        String signature = signature(
            method,
            name,
            returnType,
            visibility,
            abstractMember,
            staticMember,
            defaultMethod,
            varArgs
        );
        DocumentationMetadata documentation = describeDocumentation(
            docTrees.getDocCommentTree(new TreePath(classPath, method))
        );
        return new MemberMetadata(
            constructor ? MemberKind.CONSTRUCTOR : MemberKind.METHOD,
            name,
            signature,
            visibility,
            staticMember,
            abstractMember,
            defaultMethod,
            modifiers.contains(Modifier.FINAL),
            modifiers.contains(Modifier.SYNCHRONIZED),
            modifiers.contains(Modifier.NATIVE),
            varArgs,
            returnType,
            parameterTypes,
            exceptionTypes,
            documentation
        );
    }

    private static List<String> parameterTypes(List<? extends VariableTree> parameters, boolean varArgs) {
        List<String> types = new ArrayList<>(parameters.size());
        for (int index = 0; index < parameters.size(); index += 1) {
            String type = parameters.get(index).getType().toString();
            if (varArgs && index == parameters.size() - 1) {
                type = type.endsWith("[]")
                    ? type.substring(0, type.length() - 2) + "..."
                    : type + "...";
            }
            types.add(type);
        }
        return types;
    }

    private static String signature(
        MethodTree method,
        String name,
        String returnType,
        String visibility,
        boolean abstractMember,
        boolean staticMember,
        boolean defaultMethod,
        boolean varArgs
    ) {
        Set<Modifier> flags = method.getModifiers().getFlags();
        List<String> modifiers = new ArrayList<>();
        if (!visibility.equals("package-private")) modifiers.add(visibility);
        if (abstractMember) modifiers.add("abstract");
        if (staticMember) modifiers.add("static");
        if (flags.contains(Modifier.FINAL)) modifiers.add("final");
        if (flags.contains(Modifier.SYNCHRONIZED)) modifiers.add("synchronized");
        if (flags.contains(Modifier.NATIVE)) modifiers.add("native");
        if (flags.contains(Modifier.STRICTFP)) modifiers.add("strictfp");
        if (defaultMethod) modifiers.add("default");

        StringBuilder result = new StringBuilder();
        if (!modifiers.isEmpty()) result.append(String.join(" ", modifiers)).append(' ');
        if (!method.getTypeParameters().isEmpty()) {
            result.append('<');
            result.append(method.getTypeParameters().stream()
                .map(TypeParameterTree::toString)
                .reduce((left, right) -> left + ", " + right)
                .orElse(""));
            result.append("> ");
        }
        if (returnType != null) result.append(returnType).append(' ');
        result.append(name).append('(');
        result.append(String.join(", ", parameterTypes(method.getParameters(), varArgs)));
        result.append(')');
        if (!method.getThrows().isEmpty()) {
            result.append(" throws ");
            result.append(method.getThrows().stream()
                .map(Tree::toString)
                .reduce((left, right) -> left + ", " + right)
                .orElse(""));
        }
        return result.toString();
    }

    private static String visibility(Set<Modifier> modifiers, boolean implicitPublic) {
        if (modifiers.contains(Modifier.PUBLIC) || implicitPublic) return "public";
        if (modifiers.contains(Modifier.PROTECTED)) return "protected";
        if (modifiers.contains(Modifier.PRIVATE)) return "private";
        return "package-private";
    }

    private static DocumentationMetadata describeDocumentation(DocCommentTree docComment) {
        if (docComment == null) return null;
        List<DocumentationTagMetadata> tags = new ArrayList<>();
        for (DocTree blockTag : docComment.getBlockTags()) {
            DocumentationTagMetadata tag = describeDocumentationTag(blockTag);
            if (tag != null) tags.add(tag);
        }
        return new DocumentationMetadata(joinDocTrees(docComment.getFullBody()), tags);
    }

    private static DocumentationTagMetadata describeDocumentationTag(DocTree blockTag) {
        return switch (blockTag.getKind()) {
            case PARAM -> {
                ParamTree parameter = (ParamTree) blockTag;
                String name = parameter.getName().getName().toString();
                if (parameter.isTypeParameter()) name = "<" + name + ">";
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
        for (DocTree tree : trees) text.append(tree);
        return text.toString()
            .replace("\r\n", "\n")
            .replace('\r', '\n')
            .replaceAll("[\\t ]+", " ")
            .replaceAll(" *\\n *", "\n")
            .trim();
    }

    private static List<TypeMetadata> resolveTypes(List<TypeDraft> drafts) {
        Map<String, TypeDraft> byClassName = new LinkedHashMap<>();
        Map<String, List<TypeDraft>> bySimpleName = new HashMap<>();
        for (TypeDraft draft : drafts) {
            byClassName.put(draft.className, draft);
            bySimpleName.computeIfAbsent(draft.simpleName, ignored -> new ArrayList<>()).add(draft);
        }

        return drafts.stream().map(draft -> {
            List<RelationMetadata> relations = draft.rawRelations.stream()
                .map(relation -> new RelationMetadata(
                    resolveTypeName(relation.typeName(), draft, byClassName, bySimpleName),
                    relation.kind()
                ))
                .distinct()
                .sorted(
                    Comparator.comparing((RelationMetadata relation) -> relation.kind().ordinal())
                        .thenComparing(RelationMetadata::targetClassName)
                )
                .toList();
            return new TypeMetadata(
                draft.className,
                draft.simpleName,
                draft.packageName,
                draft.sourceFile,
                draft.kind,
                draft.finalType,
                draft.documentation,
                draft.members,
                relations
            );
        }).sorted(Comparator.comparing(TypeMetadata::className)).toList();
    }

    private static String resolveTypeName(
        String rawType,
        TypeDraft owner,
        Map<String, TypeDraft> byClassName,
        Map<String, List<TypeDraft>> bySimpleName
    ) {
        String typeName = eraseTypeArguments(rawType).replaceAll("\\s+", "");
        if (byClassName.containsKey(typeName)) return typeName;

        int firstSeparator = typeName.indexOf('.');
        String leadingName = firstSeparator < 0
            ? typeName
            : typeName.substring(0, firstSeparator);
        String imported = owner.context.explicitImports().get(leadingName);
        if (imported != null) {
            String suffix = firstSeparator >= 0
                ? typeName.substring(firstSeparator)
                : "";
            return imported + suffix;
        }

        String enclosingType = owner.className;
        while (enclosingType.startsWith(owner.packageName + ".")) {
            int separator = enclosingType.lastIndexOf('.');
            if (separator < 0) break;
            enclosingType = enclosingType.substring(0, separator);
            if (enclosingType.equals(owner.packageName)) break;
            String nestedCandidate = enclosingType + "." + typeName;
            if (byClassName.containsKey(nestedCandidate)) return nestedCandidate;
        }

        String samePackage = owner.packageName.isEmpty()
            ? typeName
            : owner.packageName + "." + typeName;
        if (byClassName.containsKey(samePackage)) return samePackage;

        List<TypeDraft> simpleMatches = bySimpleName.get(simpleName(typeName));
        if (simpleMatches != null && simpleMatches.size() == 1) {
            return simpleMatches.get(0).className;
        }
        if (!owner.context.wildcardImports().isEmpty()) {
            if (owner.context.wildcardImports().size() == 1) {
                return owner.context.wildcardImports().get(0) + "." + typeName;
            }
            for (String wildcardPackage : owner.context.wildcardImports()) {
                String candidate = wildcardPackage + "." + typeName;
                if (byClassName.containsKey(candidate)) return candidate;
            }
        }
        if (typeName.contains(".") && Character.isLowerCase(typeName.charAt(0))) return typeName;
        if (isJavaLangType(typeName)) return "java.lang." + typeName;
        return samePackage;
    }

    private static String eraseTypeArguments(String value) {
        StringBuilder result = new StringBuilder();
        int depth = 0;
        for (int index = 0; index < value.length(); index += 1) {
            char character = value.charAt(index);
            if (character == '<') depth += 1;
            else if (character == '>') depth = Math.max(0, depth - 1);
            else if (depth == 0) result.append(character);
        }
        return result.toString().replace("[]", "").replace("...", "").trim();
    }

    private static boolean isJavaLangType(String name) {
        return Set.of(
            "Object", "String", "Throwable", "Exception", "RuntimeException",
            "Error", "Enum", "Record", "Annotation", "Iterable", "Comparable",
            "Cloneable", "AutoCloseable", "Runnable", "Thread", "ThreadLocal",
            "InheritableThreadLocal", "Number", "IllegalStateException"
        ).contains(name);
    }

    private static String simpleName(String className) {
        int separator = className.lastIndexOf('.');
        return separator < 0 ? className : className.substring(separator + 1);
    }
}
