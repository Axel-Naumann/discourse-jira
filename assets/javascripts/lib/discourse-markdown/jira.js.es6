import { registerOption } from 'pretty-text/pretty-text';

registerOption((siteSettings, opts) => {
  opts.features["jira"] = siteSettings.jira_enabled;
  opts.jira_project_names = siteSettings.jira_project_names;
  opts.jira_base_url = siteSettings.jira_base_url;
});


function linkJiraUrl(text, jira_project_names, jira_base_url) {
  if (!jira_project_names || !jira_project_names.length
      || !jira_base_url || !jira_base_url.length)
    return text;

  var matches;
  var posStart = 0;
  // urlRegexp:
  // $1 Check for "[" or "/" - we *don't* want those matches as they are entered as a link.
  // $2 The project name.
  // $3 Check for "]" or "/" - we *don't* want those matches as they are entered as a link.
  var tagRegexp = new RegExp(String.raw`([\/\[])?(` + jira_project_names + String.raw`)-\d+([\/\]])?`);
  while (matches = text.slice(posStart).match(tagRegexp)) {
    console.log("AXEL: tag matches = %o", matches);
    if (matches.length == 4 &&
        !matches[1] && matches[2] && !matches[3]) {
        function str_insert(str, pos, ins) {
            console.log("AXEL: inserting TAG %s|||%s|||%s", str.slice(0,pos), ins, str.slice(pos));
            return str.slice(0, pos) + ins + str.slice(pos);
        }
        // Transform FOO-42
        // into [FOO-42](https://host.com/browse/FOO-42)
        text = str_insert(text, posStart + matches.index + matches[0].length,
                          '](' + jira_base_url + '/browse/' + matches[0] + ')');
        text = str_insert(text, posStart + matches.index, '[');
        // Fast-forward to the end of the replacement:
        posStart += matches.index + matches[0].length * 2 + jira_base_url.length + 12;
    } else {
      posStart += matches.index + matches[0].length;
    }
  }

  posStart = 0;
  // urlRegexp:
  // $1 Check for "](" - we *don't* want those matches as they are entered as a link.
  // $2 The whole URL; start with https, contain "/browse/" and the issue number.
  // $3 The issue number, a series of CAPS followed by a dash followed by digits.
  // $4 The project name.
  // $5 Any trailing "/" will make us ignore the match.
  var urlRegexp = new RegExp(String.raw`(\]\()?(` + jira_base_url + String.raw`\/browse\/((`
                             + jira_project_names + String.raw`)-\d+)\b([)\/])?)`);
  while (matches = text.slice(posStart).match(urlRegexp)) {
    console.log("AXEL: matches = %o", matches);
    if (matches.length == 6 &&
        !matches[1] && matches[2] && matches[3] && matches[4] && !matches[5]) {
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
    } else {
      posStart += matches.index + matches[0].length;
    }
  }
  return text;
}

export function setup(helper) {
  helper.addPreProcessor(text => {
    return linkJiraUrl(text,
      helper.getOptions().jira_project_names,
      helper.getOptions().jira_base_url);
  } );
}
