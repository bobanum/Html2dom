export default class Html2dom {
	static LINEFEEDS = { "LF": "\n", "CRLF": "\r\n", "CR": "\r" };
	static options = {
		varKeyword: "const",		// How to declare variables. var, let, const
		suffixOnes: false,			// Whether to add a number to the end of variable names
		linefeed: "CRLF",			// How to represent a newline : "\n", "\r\n", "\r"
		textContent: "textContent",	// How to set text content : textContent, innerHTML, textNode
		semicolon: true,			// Whether to add a semicolon at the end of each line
		compoundAppendChild: true,	// Whether to use appendChild and createElement together
		compoundClassListAdd: true,	// Whether to use multiple classList.add or multiple arguments
		classAsAttribute: false,	// Whether to use setAttribute("class", "className") or classList.add("className")
		styleAsAttribute: false,	// Whether to use setAttribute("style", "prop: val;") or style.setProperty("prop", "val")
		forceSetAttribute: false,	// Whether to use setAttribute instead of direct assignment
		forceSetProperty: false,	// Whether to use style.setProperty instead of direct assignment
		declarationsOnTop: true,	// Whether to declare all variables at the top of the code (for var only)
		quoteStyle: "double"		// Whether to use single, double or backticks quotes
	};
	/**
	 * Translates the given string into DOM elements.
	 * 
	 * @param {string} str - The string to be translated.
	 * @returns {string} - The translated result.
	 */
	static translate(str) {
		str = str.trim().replace(/&/g, "&amp;");
		const dom = document.createElement("div");
		dom.innerHTML = str;
		this.variables = {};
		const result = [];
		const nodes = Array.from(dom.childNodes);
		nodes.forEach(node => {
			const varName = this.varName(node);
			result.push(`${this.options.varKeyword} ${varName} = document.createElement(${this.q(node.localName)})${this.sc}`);
			result.push(...this.translateAttributes(node, varName));
			result.push(...this.translateContent(node.childNodes, varName));
			if (this.options.varKeyword === "var") {
				this.removeVariable(varName);
			}
		});
		if (this.options.declarationsOnTop && this.options.varKeyword === "var") {
			let varnames = result.map(line => line.match(/^var (\w+)/)).filter(match => match).map(match => match[1]);
			// Remove duplicates
			varnames = varnames.filter((name, index) => varnames.indexOf(name) === index);
			result.forEach((line, i) => {
				result[i] = line.replace(/^var\s+/, "");
			});
			result.unshift(``);
			result.unshift(`var ${varnames.join(", ")}${this.sc}`);
		}
		return result.join(this.LINEFEEDS[this.options.linefeed]);
	}
	static get sc() {
		return this.options.semicolon ? ";" : "";
	}
	static getOption(name, defaultValue) {
		return this.options[name] !== undefined ? this.options[name] : defaultValue;
	}
	static setOption(name, value) {
		this.options[name] = value;
	}
	static translateAttributes(node, varName) {
		const result = [];
		if (!node.attributes) return result;
		const attributes = Array.from(node.attributes);
		attributes.forEach(attribute => {
			const name = attribute.localName;
			const value = attribute.nodeValue.replace(/"/g, "&quot;");
			if (name === "class") {
				result.push(...this.translateClasses(value, varName));
			} else if (name === "style") {
				result.push(...this.translateStyles(value, varName));
			} else {
				result.push(`${varName}.${this.attributeInstruction(name, value)}${this.sc}`);
			}
		});
		return result;
	}
	static attributeInstruction(name, value) {
		if (this.options.forceSetAttribute) {
			return `setAttribute(${this.q(name)}, ${this.q(value)})`;
		}
		if (name.slice(0, 5) === "data-") {
			return `dataset.${this.toCamelCase(name.slice(5))} = ${this.q(value)}`;
		}
		if (name.indexOf("-") !== -1) {
			return `setAttribute(${this.q(name)}, ${this.q(value)})`;
		}
		if (name === "class") {
			return `className = ${this.q(value)}`;
		}
		if (name === "style") {
			return `style.cssText = ${this.q(value)}`;
		}
		if (name === "for") {
			return `htmlFor = ${this.q(value)}`;
		}
		return `${name} = ${this.q(value)}`;
	}
	static q(str) {
		switch (this.options.quoteStyle) {
			case "single": return `'${str.replace(/'/g, "\\'")}'`;
			case "double": return `"${str.replace(/"/g, '\\"')}"`;
			case "backticks": return `\`${str.replace(/`/g, "\\`")}\``;
		}
	}
	static translateClasses(classes, varName) {
		const result = [];
		if (this.options.classAsAttribute) {
			result.push(`${varName}.${this.attributeInstruction("class", classes)}${this.sc}`);
			return result;
		}
		classes = classes.trim().split(/\s+/);
		if (this.options.compoundClassListAdd) {
			result.push(`${varName}.classList.add(${classes.map(className => `${this.q(className)}`).join(", ")})${this.sc}`);
			return result;
		}
		classes.forEach(className => {
			result.push(`${varName}.classList.add(${this.q(className)})${this.sc}`);
		});
		return result;
	}
	static translateStyles(styles, varName) {
		const result = [];
		if (this.options.styleAsAttribute) {
			result.push(`${varName}.${this.attributeInstruction("style", styles)}${this.sc}`);
			return result;
		}
		styles = styles.trim().replace(/;$/, "").split(/(?:\s*;\s*)+/);
		styles.forEach(style => {
			const [propName, propVal] = style.split(/\s*:\s*/);
			if (propName.substr(0, 2) === "--" || this.options.forceSetProperty) {
				result.push(`${varName}.style.setProperty(${this.q(propName)}, ${this.q(propVal)})${this.sc}`);
			} else {
				let camel = this.toCamelCase(propName);
				result.push(`${varName}.style.${camel} = ${this.q(propVal)}${this.sc}`);
			}
		});
		return result;
	}
	static toCamelCase(str) {
		return str.split("-").map((part, index) => index ? part[0].toUpperCase() + part.substr(1) : part).join("");
	}
	static varName(node) {
		let varName = node.localName || node.nodeName;
		if (!varName || varName === "#text") {
			return "#text";
		}
		if (varName === "#comment") {
			return "#comment";
		}
		if (node.getAttribute("id")) {
			varName = node.getAttribute("id");
			return varName;
		}
		if (node.getAttribute("class")) {
			varName = node.getAttribute("class").trim().split(/\s+/).sort().join("_");
		}
		if (this.variables[varName] === undefined) {
			this.variables[varName] = 0;
		}
		this.variables[varName] += 1;
		if (this.variables[varName] === 1 && !this.options.suffixOnes) {
			return varName;
		}
		return varName + this.variables[varName];
	}
	static removeVariable(varName) {
		varName = varName.replace(/[0-9]+$/, "");
		if (this.variables[varName] === undefined) {
			return;
		}
		this.variables[varName] -= 1;
	}
	static translateTextNode(node, parentName, appendChild = true) {
		node = node.nodeValue || node;
		node = node.replace(/\s+/g, " ");
		let result;
		if (!parentName) {
			result = `document.createTextNode(${this.q(node)})`;
		} else if (appendChild) {
			result = `${parentName}.appendChild(document.createTextNode(${this.q(node)}))`;
		} else if (this.options.textContent === "innerHTML") {
			result = `${parentName}.innerHTML = ${this.q(node)}`;
		} else if (this.options.textContent === "textNode") {
			result = `${parentName}.appendChild(document.createTextNode(${this.q(node)}))`;
		} else {
			result = `${parentName}.textContent = ${this.q(node)}`;
		}
		return [`${result}${this.sc}`];
	}
	static translateCommentNode(node, parentName) {
		node = node.nodeValue || node;
		let result;
		if (parentName) {
			result = `${parentName}.appendChild(document.createComment(${this.q(node)}))`;
		} else {
			result = `document.createComment(${this.q(node)})`;
		}
		return [`${result}${this.sc}`];
	}
	static translateElementNode(node, parentName) {
		const varName = this.varName(node);
		const result = [];
		if (parentName && this.options.compoundAppendChild) {
			result.push(`${this.options.varKeyword} ${varName} = ${parentName}.appendChild(document.createElement(${this.q(node.localName)}))${this.sc}`);
		} else {
			result.push(`${this.options.varKeyword} ${varName} = document.createElement(${this.q(node.localName)})${this.sc}`);
		}
		result.push(...this.translateAttributes(node, varName));
		result.push(...this.translateContent(node.childNodes, varName));
		if (parentName && !this.options.compoundAppendChild) {
			result.push(`${parentName}.appendChild(${varName})${this.sc}`);
		}
		if (this.options.varKeyword === "var") {
			this.removeVariable(varName);
		}
		return result;
	}
	static translateContent(nodes, parentName) {
		var result = [];
		nodes = Array.from(nodes);
		nodes = nodes.filter(node => node.nodeName !== "#text" || node.nodeValue.trim()); //TODO Check for valid spaces between tags
		if (nodes.length === 1 && nodes[0].nodeName === "#text") {
			result.push(...this.translateTextNode(nodes[0], parentName, false));
			return result;
		}
		nodes.forEach(node => {
			const nodeType = node.nodeType;
			switch (nodeType) {
				case 1: // Element
					result.push(...this.translateElementNode(node, parentName));
					break;
				case 3: // Text
					result.push(...this.translateTextNode(node, parentName));
					break;
				case 8: // Comment
					result.push(...this.translateCommentNode(node, parentName));
					break;
			}
		});
		return result;
	}
}
