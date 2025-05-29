// utils/registerCNLCompletion.js

export function registerCNLCompletion(monaco, relationTypes = [], attributeTypes = []) {
  monaco.languages.registerCompletionItemProvider("plaintext", {
    provideCompletionItems: () => {
      const relationItems = (relationTypes || []).map(r => ({
        label: r.name,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: r.name,
        documentation: r.description || ""
      }));

      const attributeItems = (attributeTypes || []).map(a => ({
        label: a.name,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: a.name,
        documentation: a.description || ""
      }));

      return {
        suggestions: [...relationItems, ...attributeItems]
      };
    }
  });
}
