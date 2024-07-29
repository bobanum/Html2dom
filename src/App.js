import Html2dom from "./Html2dom.js";

export default class App {
	static main() {
		this.getOptions();
		this.form = document.getElementById("html2dom");
		this.editorHTML = this.addHtmlEditor();
		this.editorJs = this.createEditor("out", "javascript");
		this.editors = {
			html: this.editorHTML,
			dom: this.editorJs,
		};
		this.update();
		this.options = document.getElementById("options");
		options.addEventListener("input", e => {
			if (e.target.type === "checkbox") {
				Html2dom.setOption(e.target.name, e.target.checked);
			} else {
				Html2dom.setOption(e.target.name, e.target.value);
			}
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
		editor.setValue(window.example.innerHTML, -1);
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
		// editor.session.setUseWrapMode(true);
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
	static addBackdrop(text) {
		const backdrop = document.createElement("div");
		backdrop.classList.add("backdrop");
		backdrop.classList.add("off");
		const script = document.createElement("iframe");
		backdrop.appendChild(script);
		document.body.appendChild(backdrop);
		script.contentWindow.document.write(`<body><script>${text}</script></body>`);
		backdrop.addEventListener("click", e => {
			backdrop.classList.add("off");
			backdrop.addEventListener("transitionend", e => {
				document.body.removeChild(backdrop);
			}, { once: true });
		});
		setTimeout(() => {
			backdrop.classList.remove("off");
		}, 10);
		return backdrop;
	}
	static evt = {
		clickCopy: e => {
			const text = this.editors[e.target.closest("fieldset").id].getValue();
			navigator.clipboard.writeText(text);
			e.target.classList.add("clicked");
			e.target.addEventListener("animationend", e => {
				e.target.classList.remove("clicked");
			}, { once: true });
		},
		clickCopyHtml: e => {
			const text = this.editorHTML.getValue();
			navigator.clipboard.writeText(text);
		},
		clickPlay: e => {
			this.addBackdrop(this.editorJs.getValue());
		},
		clickWordWrap: e => {
			const checked = e.target.classList.toggle("checked");
			const editor = this.editors[e.target.closest("fieldset").id];
			editor.session.setUseWrapMode(checked);
		},
	};
}
