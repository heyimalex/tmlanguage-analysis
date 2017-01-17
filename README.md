# tmLanguage-analysis

Hello! This little project analyzes tmLanguage files out in the wild to verify assumptions about their shape. This is for some upcoming work writing a tmLanguage-based syntax highlighter in rust.

## Downloading the grammars

Quite a few text editors use the tmLanguage format as the basis for their syntax highlighting. The `download.js` script will download the most commonly used grammars for textmate, atom, and vscode. There is probably a lot of duplication in this set but I figured it would be a decent base. Note that this script downloads a bunch of data from github, so be considerate and don't run it often.

The `process.js` script takes the artifacts downloaded, pulls out the grammars, parses them, and then saves them in the grammars folder as json. I decided to include the processed grammars to make life easier, but `rm -rf grammars && node download.js && node process.js` should be able to reproduce them from scratch.

## Analyzing

Analysis was done in a couple of ways. First, I created a json schema for broad validation, which can be found in `validate.js`.

I also wanted to learn more specific things, like the number of end and while patterns containing backrefs, the number of scope names that are format strings, how injection rules look, etc. Generally just stats on how common feature usage is. For that I built a little parser in `analyze.js` that I could manually hook into to learn what I wanted. It takes more manual intervention but the code shouldn't be too bad to read.

I'm pretty much where I need to be to move onto the next stage, but I'm planning on writing a blog post or something about all of this at some point in the future. Reach out if you have any questions!

## Acknowledgements

A ton of the groundwork was laid by [this article by Matt Neuburg](http://www.apeth.com/nonblog/stories/textmatebundle.html), which filled in a bunch of the gaps left in [the official documentation](https://manual.macromates.com/en/language_grammars).
