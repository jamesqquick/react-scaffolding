export const getBasicComponentSnippet = (name) => {
    return `import React from 'react'

export default function ${name}() {
    return (
        <div>
            
        </div>
    )
}
`;
};

export const getComponentThatLoadsDataSnippet = (
    componentName: string,
    dataName: string
) => {
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
    if (!str) return;

    return str[0].toUpperCase() + str.slice(1);
}
