# Options

All options can be used as CLI arguments, declared in the package.json, or your project can have an `.igniterc`. This file can be at the project root or anywhere [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) can find it.

```json
{
  "ignite": {
    "src": "some/path/to/folder"
  }
}
```

[[toc]]

---

## Source (--src, -s)

Source folder to search for markdown files in

```bash
ignite --src docs
```

## Destination (--dst, -d)

Folder to output bundled documentation website.

```bash
ignite --dst _ignite
```

## Index (--index, -i)

Fill to be used as the index of your website. Is also used as the sidebar. This file should be located in the docs folder

```bash
ignite --index index.md
```

## Static (--static)

Build the documentation website as individual static html pages.

```bash
ignite --static
```

## Plugins (--plugins)

A list of plugins (package names or functions) to render your documentation with.

```bash
ignite --plugins markdown-it-emoji markdown-it-video
```

::: message is-success is-three-fifths is-offset-one-fifth has-text-centered
More on including Ignite plugins [here](./IgnitePlugins.md#register-plugin)
:::

## Publish (--publish)

Publish the docs to the githubURL. Must [setup](./Publishing.md)

```bash
ignite --publish
```

## Watch (--watch, -w)

Build the documentation website and serve it on localhost. Default port is 8008.

```bash
ignite --watch
```

## Port (--port, -p)

Port to start the documentation website on.

```bash
ignite --port 1337
```

## Title (--title, -t)

Title of the docs. Usually what you are documenting. Used in the navigation bar.

```bash
ignite --title 'My Cool Docs'
```

## Logo (--logo)

Logo for app. Displayed in title bar.

```bash
ignite --logo 'logo.svg'
```

## GitHub URL (--githubURL)

If present includes a link to github. Usually where you store the source code for what you're documenting.

```bash
ignite --githubURL https://github.com/Team/Project
```

## Code Highlight Style (--codeStyle)

Code highlight style for code blocks. Can use any of [these](https://github.com/isagalaev/highlight.js/tree/master/src/styles) styles

```bash
ignite --codeStyle foundation
```

## App Color (--color, -c)

Specify the color to use throughout the app.

```bash
ignite --color 'cadetblue'
ignite --color '#f44336'
```

---

## Utility Commands

### Version (--version, -v)

Current version of Ignite.

```bash
ignite --version
```

### Help (--help -h)

List all of these commands an their defaults.

```bash
ignite --help
```
