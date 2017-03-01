import { registerOption } from 'pretty-text/pretty-text';

registerOption((siteSettings, opts) => {
  opts.features["plugin-jira"] = true;
});

function linkJiraUrl(text) {
  // The Regexp:
  // $1 Check for "](" - we *don't* want those matches as they are entered as a link.
  // $2 The whole URL; start with https, contain "/browse/" and the issue number.
  // $3 The issue number, a series of CAPS followed by a dash followed by digits.
  // $4 Any trailing "/" will make us ignore the match.
  var posStart = 0;
  var urlRegexp = new RegExp(String.raw`(\]\()?(https:\/\/.*\/browse\/([A-Z]+-\d+)\b(\/)?)`); 
  var matches;
  while (matches = text.slice(posStart).match(urlRegexp)) {
    console.log("AXEL: matches = %o", matches);
    if (matches.length == 5 &&
        !matches[1] && matches[2] && matches[3] && !matches[4]) {
        function str_insert(str, pos, ins) {
            console.log("AXEL: inserting %s|||%s|||%s", str.slice(0,pos), ins, str.slice(pos));
            return str.slice(0, pos) + ins + str.slice(pos);
        }
        // Transform https://host.com/browse/FOO-42
        // into [FOO-42](https://host.com/browse/FOO-42)
        text = str_insert(text, posStart + matches.index + matches[2].length, ')');
        text = str_insert(text, posStart + matches.index, '[' + matches[3] + '](');
        // Fast-forward to the end of the replacement:
        posStart += matches.index + matches[2].length +  matches[3].length + 4;
    }
  }
  return text;
}

export function setup(helper) {
  helper.addPreProcessor(linkJiraUrl);
}
