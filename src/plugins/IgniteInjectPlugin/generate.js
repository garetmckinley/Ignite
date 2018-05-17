import path from 'path';
import { parseScript } from 'esprima';
import types from 'ast-types';
import escodegen from 'escodegen';

const { builders } = types;

const functionsToString = obj => {
  const isArray = Array.isArray(obj);
  let stringOptions = isArray ? '[' : '{';

  Object.entries(obj).forEach(([key, val]) => {
    if (typeof val === 'function') {
      val = val.toString();
    } else if (typeof val === 'object') {
      val = functionsToString(val);
    } else {
      val = `"${val}"`;
    }

    stringOptions += isArray ? `${val},` : `"${key}": ${val},`;
  });

  stringOptions += isArray ? ']' : '}';

  return stringOptions;
};

export const stringify = code => {
  try {
    const options = functionsToString(code);
    const ast = parseScript(`var options = ${options}`).body;
    const program = builders.program(ast);

    return escodegen.generate(program);
  } catch (error) {
    throw new Error('Error parsing options.', error);
  }
};

const registerMarkdown = (entries, options) => {
  return entries
    .map(
      e => `registerMarkdown('${path.relative(
        options.src,
        e
      )}', () => import('${e}'));
        `
    )
    .join('\n');
};

const generatePlugins = plugins => {
  // E0: Name of plugin
  // E1: Path to plugin (can be npm module name)
  // E2: Options for plugin
  return plugins
    .map(e => {
      const options = e && e[2] ? stringify(e[2]) : 'var options = {}';

      return `
      import * as ${e[0]} from '${e[1]}';
      
      ${options};

      window.configuration.plugins.push(['${e[0]}', ${e[0]}.default, options]);
      `;
    })
    .join('\n');
};

const initLazyLoad = options => {
  return `
    window.configuration = {
      markdown: [],
      plugins: [],
      setFirstLink() {
        console.log('Called setFirstLink before it was configured');
      }
    };

    import React from 'react';

    function lazyLoad(CompProvider) {
      return class extends React.Component {
        constructor(props) {
          super(props);
          this.state = {
            Comp: null
          }
        }

        componentDidMount() {
          if (!this.state.Comp) {
            CompProvider().then(c => {
              this.setState({
                Comp: c.default
              });
            });
          }
        }

        render() {
          const { Comp } = this.state;
          return Comp ? React.createElement(Comp, this.props, null) : null;
        }
      }
    }

    const INDEX_PAGE = '${options.index}';
    import path from 'path';

    function isIndex(p) {
      return p.includes(INDEX_PAGE) && 
        (!process.env.navItems || 
          Object.values(process.env.navItems)
            .map(item => {
              return item === '/' ? INDEX_PAGE : path.join(item, INDEX_PAGE);
            })
            .includes(p)
          );
    }

    function registerMarkdown(path, provider) {
      const comp = lazyLoad(provider);
      if(isIndex(path)) {
        window.configuration.markdown.push([path, comp, true, null]);
      } else {
        window.configuration.markdown.push([path, comp]);
      }
    }
  `;
};

export default function generate(entries = [], plugins = [], options = {}) {
  return () => {
    let generated = initLazyLoad(options);
    generated += registerMarkdown(entries, options);

    if (plugins.length > 0) {
      generated += generatePlugins(plugins);
    }

    return generated;
  };
}