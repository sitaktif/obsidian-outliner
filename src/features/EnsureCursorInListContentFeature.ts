import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { Settings } from "src/settings";

export class EnsureCursorInListContentFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private editorUtils: EditorUtils,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("cursorActivity", this.handleCursorActivity);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("cursorActivity", this.handleCursorActivity);
    });
  }

  private ensureCursorInListContent(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();
    const indentSign = this.listsUtils.detectListIndentSign(editor, cursor);

    if (indentSign === null) {
      return;
    }

    const line = editor.getLine(cursor.line);
    const linePrefix = this.listsUtils.getListLineInfo(line, indentSign)
      .prefixLength;

    if (cursor.ch < linePrefix) {
      cursor.ch = linePrefix;
      editor.setCursor(cursor);
    }
  }

  private ensureCursorIsInUnfoldedLine(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();

    const mark = editor.findMarksAt(cursor).find((m) => (m as any).__isFold);

    if (!mark) {
      return;
    }

    const firstFoldingLine: CodeMirror.LineHandle = (mark as any).lines[0];

    if (!firstFoldingLine) {
      return;
    }

    const lineNo = editor.getLineNumber(firstFoldingLine);

    if (lineNo !== cursor.line) {
      editor.setCursor({
        line: lineNo,
        ch: editor.getLine(lineNo).length,
      });
    }
  }

  private handleCursorActivity = (cm: CodeMirror.Editor) => {
    if (
      this.settings.stickCursor &&
      this.editorUtils.containsSingleCursor(cm) &&
      this.listsUtils.isCursorInList(cm)
    ) {
      this.ensureCursorIsInUnfoldedLine(cm);
      this.ensureCursorInListContent(cm);
    }
  };
}
