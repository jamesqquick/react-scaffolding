"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComponentThatLoadsDataSnippet = exports.getBasicComponentSnippet = void 0;
exports.getBasicComponentSnippet = (name) => {
    return `import React from 'react'

export default function ${capitalize(name)}() {
    return (
        <div>
            
        </div>
    )
}
`;
};
exports.getComponentThatLoadsDataSnippet = (componentName, dataName) => {
    const loadFunctionName = `load${capitalize(dataName)}`;
    const dataNameSingular = dataName.slice(0, -1);
    return `import React, { useState, useEffect } from 'react';

export default function ${capitalize(componentName)}() {
    const [${dataName}, set${capitalize(dataName)}] = useState([]);

    const ${loadFunctionName} = async () => {
        try {
            const res = await fetch('');
            const ${dataName} = await res.json();
            set${capitalize(dataName)}(${dataName});
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        ${loadFunctionName}();
    }, []);

    return (
        <div>
            {${dataName}.map(${dataNameSingular} => (<></>))} 
        </div>
    );
}

`;
};
function capitalize(str) {
    if (!str)
        return;
    return str[0].toUpperCase() + str.slice(1);
}
//# sourceMappingURL=Snippets.js.map