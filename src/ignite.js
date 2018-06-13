#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

import history from 'connect-history-api-fallback';
import convert from 'koa-connect';
import git from 'simple-git/promise';
import dayjs from 'dayjs';
import globby from 'globby';
import register from '@babel/register';
import root from 'root-path';
import cosmiconfig from 'cosmiconfig';
import webpack from 'webpack';
import serve from 'webpack-serve';
import ghpages from 'gh-pages';
import createStaticWebsite from 'react-snap';
import webpackServeWaitpage from 'webpack-serve-waitpage';

import configDev from '../webpack.config.dev';
import config from '../webpack.config';
import packageJSON from '../package';
import { transform } from './loaders/hash-link';

register(packageJSON.babel || {});

export async function initPlugins(options) {
  options.plugins.forEach(async plugin => {
    let [, pluginPath, pluginOptions] = plugin;
    const initFile = path.join(pluginPath, 'init.js');

    if (!pluginOptions) {
      pluginOptions = {};
      plugin[2] = pluginOptions;
    }

    if (fs.existsSync(initFile)) {
      try {
        pluginOptions._initData = await require(path.resolve(initFile))(
          pluginOptions
        );
      } catch (err) {
        console.error(err, '');
      }
    }
  });

  return options;
}

export async function blogPosts(options) {
  let blogPosts = await globby([path.join(options.src, 'blog/**/*.md')]);

  if (blogPosts.length === 0) {
    return null;
  }

  blogPosts = await Promise.all(
    blogPosts
      .map(blogFile => path.relative(options.src, blogFile))
      .map(async blogFile => {
        try {
          const docLog = await git().log({ file: 'docs/' + blogFile });
          const birth = docLog.all[docLog.all.length - 1].date;

          return {
            path: blogFile,
            birth: Number(dayjs(birth))
          };
        } catch (error) {
          return {};
        }
      })
  );

  return blogPosts;
}

export function getAuthor() {
  const rootJson = JSON.parse(fs.readFileSync(`${root()}/package.json`));
  const author = rootJson ? rootJson.author : {};

  return author;
}

export const defaults = {
  mode: 'production',
  webpackPlugins: [],
  plugins: [],
  baseURL: '/',
  static: false,
  src: 'docs/',
  dst: '_ignite/',
  index: 'index.md',
  port: 8008,
  title: 'Documentation',
  codeStyle: 'foundation',
  color: 'auto',
  selectedColor: 'auto',
  logo: 'logo.svg',
  bulmaTheme: 'default'
};

function initBuildMessages(options) {
  if (options.watch) {
    options = Object.assign({}, options, {
      mode: 'development',
      compilationSuccessInfo: {
        messages: [
          `You documentation is running here http://localhost:${options.port}`
        ]
      }
    });
  } else {
    options = Object.assign({}, options, {
      compilationSuccessInfo: {
        messages: ['Documentation built!'],
        notes: [
          `Bundled documentation stored in '${options.dst}'.`,
          'Run `ignite --publish` to publish documentation to github-pages.'
        ]
      }
    });
  }

  return options;
}

function publish(options, user) {
  if (options.githubURL.includes('http')) {
    [, options.githubURL] = options.githubURL.split('//');
  }

  ghpages.publish(
    options.dst,
    {
      message: ':memo: Update Documentation',
      repo: `https://username:${process.env.GITHUB_KEY}@${options.githubURL}`,
      user
    },
    err => {
      if (err) {
        console.error(err);
        return;
      }

      console.warn('Documentation published to github-pages!');
    }
  );
}

async function initSearchIndex(options) {
  const entries = await globby([path.join(options.src, '**/*.md')]);
  const files = [];

  entries.forEach(entry => {
    if (fs.existsSync(entry)) {
      const pageContents = fs.readFileSync(entry, 'utf8');
      const pagePath = path.relative(options.src, entry);

      files.push({
        id: pagePath,
        body: transform(pageContents, entry, options)
      });
    }
  });

  return files;
}

async function initOptions(options) {
  const explorer = cosmiconfig('ignite');
  const igniteRc = explorer.searchSync();

  if (igniteRc) {
    options = Object.assign({}, options, igniteRc.config);
  }

  options = Object.assign({}, options, {
    baseURL: options.watch ? '/' : path.join('/', options.baseURL, '/')
  });

  options = initBuildMessages(options);
  options.blogPosts = await blogPosts(options);
  options.searchIndex = await initSearchIndex(options);

  if (options.plugins) {
    options = await initPlugins(options);
  }

  return Object.assign({}, defaults, options);
}

export default async function build(options) {
  const user = getAuthor();

  options = await initOptions(options);

  if (options.publish) {
    if (!options.githubURL) {
      console.error('Need to provide githubURL option to publish');
      return;
    }

    if (!user.name) {
      console.error('Need author.name in package.json to publish');
      return;
    }

    if (!user.email) {
      console.error('Need author.email in package.json to publish');
      return;
    }
  }

  if (options.watch) {
    const webpackConfig = configDev(options);

    serve({
      config: webpackConfig,
      port: options.port,
      logLevel: 'silent',
      dev: { logLevel: 'silent' },
      hot: { logLevel: 'silent' },
      add: (app, middleware, options) => {
        app.use(
          webpackServeWaitpage(options, {
            title: 'Ignite Dev Server',
            theme: 'material'
          })
        );

        app.use(
          convert(
            history({
              ...webpackConfig.devServer.historyApiFallback
            })
          )
        );
      },
      on: {
        listening: () => {
          execSync('ps cax | grep "Google Chrome"');
          execSync(
            `osascript ../src/chrome.applescript "${encodeURI(
              `http://localhost:${options.port}`
            )}"`,
            {
              cwd: __dirname,
              stdio: 'ignore'
            }
          );
        }
      }
    });
  } else {
    const webpackConfig = config(options);
    const compiler = webpack(webpackConfig);

    compiler.run(async (err, stats) => {
      if (options.json) {
        fs.writeFile(
          'stats.json',
          JSON.stringify(stats.toJson(), null, 2),
          () => {
            console.warn('Wrote `stats.json` to root.');
          }
        );
      }

      if (err) {
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return;
      }

      stats.hasWarnings();

      if (stats.hasErrors()) {
        return;
      }

      if (options.static) {
        await createStaticWebsite.run({
          source: options.dst,
          publicPath: path.join(options.baseURL, '/')
        });
      }

      if (options.publish) {
        publish(options, user);
      }
    });
  }
}
