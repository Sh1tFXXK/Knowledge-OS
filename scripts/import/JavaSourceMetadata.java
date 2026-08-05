import java.util.List;
import java.util.Map;

enum TypeKind {
    INTERFACE,
    ABSTRACT_CLASS,
    CLASS,
    ENUM,
    RECORD,
    ANNOTATION
}

enum RelationKind {
    EXTENDS,
    IMPLEMENTS
}

enum MemberKind {
    CONSTRUCTOR,
    METHOD
}

record DocumentationTagMetadata(String kind, String name, String text) {}

record DocumentationMetadata(
    String description,
    List<DocumentationTagMetadata> tags
) {}

record RelationMetadata(String targetClassName, RelationKind kind) {}

record MemberMetadata(
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

record CompilationContext(
    String packageName,
    Map<String, String> explicitImports,
    List<String> wildcardImports
) {}

record RawRelation(String typeName, RelationKind kind) {}

record TypeMetadata(
    String className,
    String simpleName,
    String packageName,
    String sourceFile,
    TypeKind kind,
    boolean finalType,
    DocumentationMetadata documentation,
    List<MemberMetadata> members,
    List<RelationMetadata> relations
) {}

final class TypeDraft {
    final String className;
    final String simpleName;
    final String packageName;
    final String sourceFile;
    final TypeKind kind;
    final boolean finalType;
    final DocumentationMetadata documentation;
    final List<MemberMetadata> members;
    final List<RawRelation> rawRelations;
    final CompilationContext context;

    TypeDraft(
        String className,
        String simpleName,
        String packageName,
        String sourceFile,
        TypeKind kind,
        boolean finalType,
        DocumentationMetadata documentation,
        List<MemberMetadata> members,
        List<RawRelation> rawRelations,
        CompilationContext context
    ) {
        this.className = className;
        this.simpleName = simpleName;
        this.packageName = packageName;
        this.sourceFile = sourceFile;
        this.kind = kind;
        this.finalType = finalType;
        this.documentation = documentation;
        this.members = members;
        this.rawRelations = rawRelations;
        this.context = context;
    }
}

record SourceUnit(String name, String text) {}

record SourceOptions(java.nio.file.Path source, String prefix, int maxFiles) {}
