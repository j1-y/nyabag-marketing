export type TemplateVariables = Record<string, string | null | undefined>;

const variablePattern = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;

function valueFor(name: string, variables: TemplateVariables) {
  return variables[name] ?? "";
}

export function renderTemplate(templateHtml: string, variables: TemplateVariables) {
  return templateHtml.replace(variablePattern, (_match, name: string) => valueFor(name, variables));
}

export function renderSubject(subject: string, variables: TemplateVariables) {
  return renderTemplate(subject, variables);
}

export function extractVariables(content: string) {
  return Array.from(content.matchAll(variablePattern), (match) => match[1]).filter(
    (name, index, all) => all.indexOf(name) === index
  );
}

export function firstNameFromName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? "";
}
