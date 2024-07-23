/*jslint browser:true, esnext:true */
import Html2dom from "./Html2dom.js";
export default class App {
	static main() {
		this.form = document.getElementById("html2dom");
		this.editorHTML = this.addHtmlEditor();
		this.editorJs = this.createEditor("out", "javascript");
		this.update();
	}
	static update() {
		var htmlIn = this.editorHTML.getValue();
		console.log(htmlIn);
		var result = Html2dom.translate(htmlIn);
		this.editorJs.setValue(result);
	}
	static addHtmlEditor() {
		const editor = this.createEditor("in");
		editor.setValue(window.exemple.innerHTML);
		editor.getSession().on('change', () => {
			this.update();
		});
		return editor;
	}
	static createEditor(id, mode = "html") {
		const editor = ace.edit(id);
		editor.setTheme("ace/theme/monokai");
		editor.setFontSize(16);
		editor.session.setMode(`ace/mode/${mode}`);
		return editor;

	}
	static addJsEditor() {
		const editor = this.createEditor("out", "javascript");
		editor.setTheme("ace/theme/monokai");
		editor.session.setMode("ace/mode/javascript");
		return editor;
	}
	static load() {
		return new Promise(resolve => {
			window.addEventListener("load", e => {
				resolve(e);
			});
		}).then(data => {
			return this.main(data);
		});
	}
}
