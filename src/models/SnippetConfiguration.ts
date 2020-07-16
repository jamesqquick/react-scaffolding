export default interface SnippetConfiguration {
    inputs?: ConfigInput[];
    generateSnippet: Function;
}

export interface ConfigInput {
    name: string;
    prompt: string;
    placeholder: string;
}
