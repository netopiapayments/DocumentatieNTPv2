import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';

const style = HighlightStyle.define([
  { tag: t.propertyName, color: '#7ee787' },
  { tag: t.string, color: '#a5d6ff' },
  { tag: t.number, color: '#79c0ff' },
  { tag: [t.bool, t.null], color: '#ff7b72' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#8b949e', fontStyle: 'italic' },
  { tag: [t.brace, t.squareBracket, t.separator, t.punctuation], color: '#c9d1d9' },
  { tag: t.invalid, color: '#c9d1d9' },
]);

const theme = EditorView.theme(
  {
    '&': { color: '#e6edf3', backgroundColor: 'transparent', fontSize: '13px' },
    '.cm-content': { fontFamily: 'var(--font-mono)', padding: '14px 0', caretColor: '#e4e4e7' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.65' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#4d5560', border: 'none', paddingLeft: '6px' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 6px', minWidth: '28px' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.035)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#8b949e' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor': { borderLeftColor: '#e4e4e7', borderLeftWidth: '1px' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(124,140,248,0.25) !important' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(255,255,255,0.08)', outline: '1px solid rgba(255,255,255,0.15)' },
  },
  { dark: true },
);

export interface JsonEditor {
  view: EditorView;
  get(): string;
  set(text: string): void;
}

export function createEditor(parent: HTMLElement, doc: string, onChange: (text: string, user: boolean) => void, onRun: () => void): JsonEditor {
  let programmatic = false;
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        json(),
        syntaxHighlighting(style),
        theme,
        keymap.of([
          { key: 'Mod-Enter', run: () => { onRun(); return true; } },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString(), !programmatic);
        }),
      ],
    }),
  });
  return {
    view,
    get: () => view.state.doc.toString(),
    set(text) {
      programmatic = true;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
      programmatic = false;
    },
  };
}
