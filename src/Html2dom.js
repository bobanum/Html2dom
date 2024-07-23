export default class Html2dom {
	static varKeyword = "var";			// How to declare variables. var, let, const
	static suffixOnes = false;			// Whether to add a number to the end of variable names
	static CRLF = "\r\n";				// How to represent a newline : "\n", "\r\n", "\r"
	static semicolon = true;			// Whether to add a semicolon at the end of each line
	static compoundAppendChild = true;	// Whether to use appendChild and createElement together
	static compoundClassListAdd = true;	// Whether to use multiple classList.add or multiple arguments
	static forceInnerHTML = false;		// Whether to use innerHTML instead of textContent
	static forceSetAttribute = false;	// Whether to use setAttribute instead of direct assignment
	static forceSetProperty = false;	// Whether to use style.setProperty instead of direct assignment
	static appendTextNode = false;		// Whether to use createTextNode and appendChild
	static declarationsOnTop = true;	// Whether to declare all variables at the top of the code (for var only)
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
			result.push(`${this.varKeyword} ${varName} = document.createElement("${node.localName}");`);
			result.push(...this.translateAttributes(node, varName));
			result.push(...this.translateContent(node.childNodes, varName));
			if (this.varKeyword === "var") {
				this.removeVariable(varName);
			}
		});
		if (this.declarationsOnTop && this.varKeyword === "var") {
			let varnames = result.map(line => line.match(/^var (\w+)/)).filter(match => match).map(match => match[1]);
			// Remove duplicates
			varnames = varnames.filter((name, index) => varnames.indexOf(name) === index);
			result.forEach((line, i) => {
				result[i] = line.replace(/^var\s+/, "");
			});
			result.unshift(``);
			result.unshift(`var ${varnames.join(", ")};`);
		}
		return result.join(this.CRLF);
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
				result.push(`${varName}.setAttribute("${name}", "${value}");`);
			}
		});
		return result;
	}
	static translateClasses(classes, varName) {
		const result = [];
		classes = classes.trim().split(/\s+/);
		if (this.compoundClassListAdd) {
			result.push(`${varName}.classList.add(${classes.map(className => `"${className}"`).join(", ")});`);
			return result;
		}
		classes.forEach(className => {
			result.push(`${varName}.classList.add("${className}");`);
		});
		return result;
	}
	static translateStyles(styles, varName) {
		const result = [];
		styles = styles.trim().replace(/;$/, "").split(/(?:\s*;\s*)+/);
		styles.forEach(style => {
			const [propName, propVal] = style.split(/\s*:\s*/);
			if (propName.substr(0, 2) === "--" || this.forceSetProperty) {
				result.push(`${varName}.style.setProperty("${propName}", "${propVal}");`);
			} else {
				let camel = this.toCamelCase(propName);
				result.push(`${varName}.style.${camel} = "${propVal}";`);
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
		if (this.variables[varName] === 1 && !this.suffixOnes) {
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
		if (!parentName) {
			return [`document.createTextNode("${node}");`];
		} else if (appendChild) {
			return [`${parentName}.appendChild(document.createTextNode("${node}"));`];
		} else {
			return [`${parentName}.textContent = "${node}";`];
		}
	}
	static translateCommentNode(node, parentName) {
		node = node.nodeValue || node;
		if (parentName) {
			return [`${parentName}.appendChild(document.createComment("${node}"));`];
		} else {
			return [`document.createComment("${node}");`];
		}
	}
	static translateElementNode(node, parentName) {
		const varName = this.varName(node);
		const result = [];
		if (parentName) {
			result.push(`${this.varKeyword} ${varName} = ${parentName}.appendChild(document.createElement("${node.localName}"));`);
		} else {
			result.push(`${this.varKeyword} ${varName} = document.createElement("${node.localName}");`);
		}
		result.push(...this.translateAttributes(node, varName));
		result.push(...this.translateContent(node.childNodes, varName));
		if (this.varKeyword === "var") {
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
