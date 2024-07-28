export default class Html2dom {
	static LINEFEEDS = { "LF": "\n", "CRLF": "\r\n", "CR": "\r" };
	static options = {
		varKeyword: "const",		// How to declare variables. var, let, const
		suffixOnes: false,			// Whether to add a number to the end of variable names
		linefeed: "CRLF",			// How to represent a newline : "\n", "\r\n", "\r"
		textContent: "textContent",	// How to set text content : textContent, innerHTML, textNode
		semicolon: true,			// Whether to add a semicolon at the end of each line
		addToBody: true,			// Whether to append the elements to the body
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
		result.push(...this.translateContent(nodes, this.options.addToBody ? "document.body" : null));

		if (this.options.declarationsOnTop && this.options.varKeyword === "var") {
			let varnames = result.map(line => line.match(/^var (\w+)/)).filter(match => match).map(match => match[1]);
			// Remove duplicates
			varnames = varnames.filter((name, index) => varnames.indexOf(name) === index);
			result.forEach((line, i) => {
				result[i] = line.replace(/^var\s+/, "");
			});
			result.unshift(``);
			result.unshift(this.i(`var ${varnames.join(", ")}`));
		}
		return result.join(this.LINEFEEDS[this.options.linefeed]);
	}
	static getOption(name, defaultValue) {
		return this.options[name] !== undefined ? this.options[name] : defaultValue;
	}
	static setOption(name, value) {
		this.options[name] = value;
	}
	static translateContent(nodes, parentName) {
		var result = [];
		nodes = Array.from(nodes);
		nodes = nodes.filter(node => node.nodeType !== 3 || node.nodeValue.trim()); //TODO Check for valid spaces between tags
		if (nodes.length === 1 && nodes[0].nodeType === 3) {
			result.push(this.translateTextNode(nodes[0], parentName, false));
			return result;
		}
		nodes.forEach(node => {
			const nodeType = node.nodeType;
			switch (nodeType) {
				case 1: // Element
					result.push(...this.translateElementNode(node, parentName));
					break;
				case 3: // Text
					result.push(this.translateTextNode(node, parentName));
					break;
				case 8: // Comment
					result.push(this.translateCommentNode(node, parentName));
					break;
			}
		});
		return result;
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
				result.push(this.i(`${varName}.${this.attributeInstruction(name, value)}`));
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
		if (!str) {
			return "";
		}
		switch (this.options.quoteStyle) {
			case "single": return `'${str.replace(/'/g, "\\'")}'`;
			case "double": return `"${str.replace(/"/g, '\\"')}"`;
			case "backticks": return `\`${str.replace(/`/g, "\\`")}\``;
		}
	}
	static i(str) {
		return str + (this.options.semicolon ? ";" : "");
	}
	static translateClasses(classes, varName) {
		const result = [];
		if (this.options.classAsAttribute) {
			result.push(this.i(`${varName}.${this.attributeInstruction("class", classes)}`));
			return result;
		}
		classes = classes.trim().split(/\s+/);
		if (this.options.compoundClassListAdd) {
			result.push(this.i(`${varName}.classList.add(${classes.map(className => `${this.q(className)}`).join(", ")})`));
			return result;
		}
		classes.forEach(className => {
			result.push(this.i(`${varName}.classList.add(${this.q(className)})`));
		});
		return result;
	}
	static translateStyles(styles, varName) {
		const result = [];
		if (this.options.styleAsAttribute) {
			result.push(this.i(`${varName}.${this.attributeInstruction("style", styles)}`));
			return result;
		}
		styles = styles.trim().replace(/;$/, "").split(/(?:\s*;\s*)+/);
		styles.forEach(style => {
			const [propName, propVal] = style.split(/\s*:\s*/);
			if (propName.substr(0, 2) === "--" || this.options.forceSetProperty) {
				result.push(this.i(`${varName}.style.setProperty(${this.q(propName)}, ${this.q(propVal)})`));
			} else {
				let camel = this.toCamelCase(propName);
				result.push(this.i(`${varName}.style.${camel} = ${this.q(propVal)}`));
			}
		});
		return result;
	}
	static toCamelCase(str, separator = "-._") {
		return str.split(new RegExp(`[${separator}]`)).map((part, index) => index ? part[0].toUpperCase() + part.substr(1) : part).join("");
	}
	static varName(node) {
		if (typeof node === "string") {
			if (this.variables[node] === undefined) {
				this.variables[node] = 0;
			}
			this.variables[node] += 1;
			if (this.variables[node] === 1 && !this.options.suffixOnes) {
				return node;
			}
			return node + this.variables[node];
		}
		if (node.nodeType === 3) {
			return this.varName("text");
		} else if (node.nodeType === 8) {
			return this.varName("comment");
		} else if (node.hasAttribute("id")) {
			return this.toCamelCase(node.getAttribute("id"));
		} else if (node.hasAttribute("class")) {
			return this.classToName(node.getAttribute("class"));
		} else {
			return node.localName;
		}
	}
	static classToName(className) {
		return className.trim().split(/\s+/).sort().map(c => this.toCamelCase(c)).join("_");
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
		node = this.q(node);
		let result;
		// TODO: Check putting in a variable for root texts
		if (!parentName) {
			result = `document.createTextNode(${node})`;
		} else if (appendChild) {
			result = `${parentName}.appendChild(document.createTextNode(${node}))`;
		} else if (this.options.textContent === "innerHTML") {
			result = `${parentName}.innerHTML = ${node}`;
		} else if (this.options.textContent === "textNode") {
			result = `${parentName}.appendChild(document.createTextNode(${node}))`;
		} else {
			result = `${parentName}.textContent = ${node}`;
		}
		return this.i(result);
	}
	static translateCommentNode(node, parentName) {
		node = node.nodeValue || node;
		let result;
		if (parentName) {
			result = `${parentName}.appendChild(document.createComment(${this.q(node)}))`;
		} else {
			result = `document.createComment(${this.q(node)})`;
		}
		return this.i(result);
	}
	static translateElementNode(node, parentName) {
		const varName = this.varName(node);
		const result = [];
		if (parentName && this.options.compoundAppendChild) {
			result.push(this.i(`${this.options.varKeyword} ${varName} = ${parentName}.appendChild(document.createElement(${this.q(node.localName)}))`));
		} else {
			result.push(this.i(`${this.options.varKeyword} ${varName} = document.createElement(${this.q(node.localName)})`));
		}
		result.push(...this.translateAttributes(node, varName));
		result.push(...this.translateContent(node.childNodes, varName));
		if (parentName && !this.options.compoundAppendChild) {
			result.push(this.i(`${parentName}.appendChild(${varName})`));
		}
		if (this.options.varKeyword === "var") {
			this.removeVariable(varName);
		}
		return result;
	}
}
