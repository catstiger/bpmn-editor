import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import license from 'rollup-plugin-license';
import { terser } from 'rollup-plugin-terser'
import json from "@rollup/plugin-json";

export default {
    input: "./index.js",
    output: [
        {
            file: './dist/bpmn-jseditor.js',
            format: 'umd',
            name: 'BpmnEditor'
        },
        {
            file: './dist/bpmn-jseditor.min.js',
            format: 'umd',
            name: 'BpmnEditor',
            plugins: [
                terser()
            ]
        },
        {
            file: './dist/bpmn-jseditor-es.js',
            format: 'es'
        }
    ],
    plugins: [
        resolve({ mainFields: ["jsnext", "preferBuiltins", "browser"] }),
        commonjs({
            browser: true
        }),

        terser(),
        license(),
        json()
    ]
}