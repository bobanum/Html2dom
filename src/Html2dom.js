export default class Html2dom {
	static varKeyword = "var";	// How to declare variables. var, let, const
	static suffixOnes = false;	// Whether to add a number to the end of variable names
	static CRLF = "\r\n";	// How to represent a newline : "\n", "\r\n", "\r"
	static semicolon = true;	// Whether to add a semicolon at the end of each line
	static compoundAppendChild = true;	// Whether to use appendChild and createElement together
	static compoundClassListAdd = true;	// Whether to use multiple classList.add or multiple arguments
	static forceInnerHTML = false;	// Whether to use innerHTML instead of textContent
	static forceSetAttribute = false;	// Whether to use setAttribute instead of direct assignment
	static appendTextNode = false;	// Whether to use createTextNode and appendChild
	static translate(str) {
		str = str.trim().replace(/&/g, "&amp;");
		var dom = document.createElement("div");
		dom.innerHTML = str;
		this.variables = {};
		var result = "";
		var nodes = Array.from(dom.childNodes);
		nodes.forEach(node => {
			var varName = this.varName(node);
			result += `${this.varKeyword} ${varName} = document.createElement("${node.localName}");${this.CRLF}`;
			result += this.translateAttributes(node, varName);
			result += this.translateContent(node.childNodes, varName);
			this.removeVariable(varName);
		});
		return result;
	}
	static translateAttributes(node, varName) {
		if (!node.attributes) {
			return "";
		}
		var result = "";
		var attributes = Array.from(node.attributes);
		attributes.forEach(attribute => {
			var name = attribute.localName;
			var value = attribute.nodeValue.replace(/"/g, "&quot;");
			if (name === "class") {
				result += this.translateClasses(value, varName);
			} else if (name === "style") {
				result += this.translateStyles(value, varName);
			} else {
				result += `${varName}.setAttribute("${name}", "${value}");${this.CRLF}`;
			}
		});
		return result;
	}
	static translateClasses(classes, varName) {
		var result = "";
		classes = classes.trim().split(/\s+/);
		classes.forEach(className => {
			result += `${varName}.classList.add("${className}");${this.CRLF}`;
		});
		return result;
	}
	static translateStyles(styles, varName) {
		var result = "";
		styles = styles.trim().split(/(?: *; *)+/);
		styles.forEach(style => {
			if (!style.trim()) {
				return;
			}
			var [propName, propVal] = style.split(/\s*:\s*/);
			if (propName.substr(0,2) === "--") {
				result += `${varName}.style.setProperty("${propName}", "${propVal}");${this.CRLF}`;
			} else {
				propName = propName.split("-")[0] + propName.split("-").slice(1).map(part => part[0].toUpperCase() + part.substr(1)).join("");
				result += `${varName}.style.${propName} = "${propVal}";${this.CRLF}`;
			}
		});
		return result;
	}
	static varName(node) {
		var varName = node.localName || node.nodeName;
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
	static translateContent(nodes, parentName) {
		var result = "";
		nodes = Array.from(nodes);
		nodes = nodes.filter(node => node.nodeName !== "#text" || node.nodeValue.trim());
		if (nodes.length === 1 && nodes[0].nodeName === "#text") {
			if (parentName) {
				result += `${parentName}.textContent = "${nodes[0].nodeValue}";${this.CRLF}`;
			} else {
				result += `document.createTextNode("${nodes[0].nodeValue}");${this.CRLF}`;
			}
			return result;
		}
		nodes.forEach(node => {
			var varName = this.varName(node);
			if (varName === "#comment") {
				if (parentName) {
					result += `${parentName}.appendChild(document.createComment("${node.nodeValue}"));${this.CRLF}`;
				} else {
					result += `document.createComment("${node.nodeValue}");${this.CRLF}`;
				}
				console.log(varName);
			} else if (varName === "#text") {
				if (parentName) {
					result += `${parentName}.appendChild(document.createTextNode("${node.nodeValue}"));${this.CRLF}`;
				} else {
					result += `document.createTextNode("${node.nodeValue}");${this.CRLF}`;
				}
			} else {
				if (parentName) {
					result += `${this.varKeyword} ${varName} = ${parentName}.appendChild(document.createElement("${node.localName}"));${this.CRLF}`;
				} else {
					result += `${this.varKeyword} ${varName} = document.createElement("${node.localName}");${this.CRLF}`;
				}
				result += this.translateAttributes(node, varName);
				result += this.translateContent(node.childNodes, varName);
				this.removeVariable(varName);
			}
		});
		return result;
	}
}
