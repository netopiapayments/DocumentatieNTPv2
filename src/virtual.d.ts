declare module 'virtual:netopia-docs' {
  export interface TocItem { id: string; level: number; num: string; title: string }
  export interface Example { id: number; path: string; title: string; subtitle: string; section: string; body: string; sandbox: boolean }
  export interface SearchEntry { id: string; title: string; section: string; text: string }
  export interface SectionCard { id: string; num: string; title: string; summary: string }
  export interface Meta {
    title: string; company: string; version: string; updated: string; authors: string[]; contact: string; notice: string;
    commit: string; commitDate: string; repo: string; editUrl: string; historyUrl: string; source: string;
  }
  const docs: { meta: Meta; html: string; toc: TocItem[]; cards: SectionCard[]; examples: Example[]; search: SearchEntry[] };
  export default docs;
}
