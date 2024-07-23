/*jslint browser:true, esnext:true */
import Html2dom from "./Html2dom.js";
export default class App {
	static main() {
		this.form = document.getElementById("html2dom");
		// this.form.addEventListener("submit", e => {
		// 	e.preventDefault();
		// 	var htmlIn = e.target.htmlIn.value;
		// 	var result = Html2dom.translate(htmlIn);
		// 	e.target.domOut.value = result;
		// 	return false;
		// });
		this.editorHTML = this.addHtmlEditor();
		this.editorJs = this.addJsEditor();
		this.update();
	}
	static addHtmlEditor() {
		const editor = ace.edit("in");
		editor.setTheme("ace/theme/monokai");
		editor.session.setMode("ace/mode/html");
		// editor.autoIndent();
		editor.setValue(window.exemple.innerHTML);
		editor.getSession().on('change', () => {
			this.update();
		});
		return editor;
	}
	static update() {
		var htmlIn = this.editorHTML.getValue();
		console.log(htmlIn);
		var result = Html2dom.translate(htmlIn);
		this.editorJs.setValue(result);
	}
	static addJsEditor() {
		const editor = ace.edit("out");
		editor.setTheme("ace/theme/monokai");
		editor.session.setMode("ace/mode/javascript");
		// editor.autoIndent();
		// editor.setValue(this.form.domOut.value);
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
