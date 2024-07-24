import Html2dom from "./Html2dom.js";

//TODO: Add a button to copy the result to the clipboard
//TODO: Add a button to view the result in a new window
//TODO: quotes styles
export default class App {
	static main() {
		this.getOptions();
		this.form = document.getElementById("html2dom");
		this.editorHTML = this.addHtmlEditor();
		this.editorJs = this.createEditor("out", "javascript");
		this.update();
		this.options = document.getElementById("options");
		options.addEventListener("input", e => {
			if (e.target.type === "checkbox") {
				Html2dom.setOption(e.target.name, e.target.checked);
			} else {
				Html2dom.setOption(e.target.name, e.target.value);
			}
			// switch (e.target.name) {
			// 	case "suffixOnes":
			// 	case "semicolon":
			// 	case "compoundAppendChild":
			// 	case "compoundClassListAdd":
			// 	case "forceSetAttribute":
			// 	case "forceSetProperty":
			// 	case "appendTextNode":
			// 	case "declarationsOnTop":
			// 		Html2dom.setOption(e.target.name, e.target.checked);
			// 		break;
			// 	case "varKeyword":
			// 	case "textContent":
			// 	case "linefeed":
			// 		Html2dom.setOption(e.target.name, e.target.value);
			// 		break;
			// }
			this.update();
		});
	}
	static getOptions() {
		this.options = document.getElementById("options");
		const optionNames = Object.keys(Html2dom.options);
		for (let key of optionNames) {
			const input = options.elements[key];
			if (input.type === "checkbox") {
				Html2dom.setOption(key, input.checked);
			} else {
				Html2dom.setOption(key, input.value);
			}
		}
	}
	static update() {
		var htmlIn = this.editorHTML.getValue();
		var result = Html2dom.translate(htmlIn);
		this.editorJs.setValue(result, -1);
	}
	static addHtmlEditor() {
		const editor = this.createEditor("in");
		editor.setValue(window.exemple.innerHTML, -1);
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
