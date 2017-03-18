// (c) Axel Naumann, 2017-03-07, axel@cern.ch
// See file LICENSE in the top-most directory for the license.

import { registerOption } from 'pretty-text/pretty-text';
import Ember from 'ember';

var jiraPluginDebug = false;
function logIfDebug() {
  if (jiraPluginDebug) {
    arguments[0] = 'jira plugin: ' + arguments[0];
    Ember.Logger.debug(arguments)
  }
}


function str_insert(str, pos, ins) {
  logIfDebug("inserting TAG %s|||%s|||%s", str.slice(0,pos), ins, str.slice(pos));
  return str.slice(0, pos) + ins + str.slice(pos);
}


function extractProjectToURLStem(exampleUrl) {
  // For https://sft.its.cern.ch/jira/browse/ROOT-8398 extract
  // "ROOT" and "https://sft.its.cern.ch/jira"
  var urlRegexp = new RegExp(String.raw`(https:\/\/.*)\/browse\/(([A-Z]+)-\d+)`);
  var matches;
  if (matches = exampleUrl.match(urlRegexp)) {
    logIfDebug("url extraction %o", matches);
    if (matches.length == 4)
      return [matches[1], matches[3]];
  }
  return null;
}


registerOption((siteSettings, opts) => {
  opts.features["jira"] = siteSettings.jira_enabled;

  var urlsArr = siteSettings.jira_project_urls.split('|');
  opts.jira_projects = {};
  for (var iurl = 0; iurl < urlsArr.length; iurl++) {
    var match = extractProjectToURLStem(urlsArr[iurl]);
    if (match) {
      opts.jira_projects[match[1]] = match[0];
    } else {
      Ember.Logger.error("jira plugin: invalid URL %s", urlsArr[iurl]);
    }
  }
});


function linkJiraUrl(text, jira_projects) {
  if (!jira_projects)
    return text;

  var matches;
  var posStart = 0;
  var projectNamesOred = Object.keys(jira_projects).join('|');
  // urlRegexp:
  // $1 Check for "[" or "/" - we *don't* want those matches as they are entered as a link.
  // $2 The project name.
  // $3 Check for "]" or "/" - we *don't* want those matches as they are entered as a link.
  var tagRegexp = new RegExp(String.raw`([\/\[])?(` + projectNamesOred + String.raw`)-\d+([\/\]])?`);
  while (matches = text.slice(posStart).match(tagRegexp)) {
    logIfDebug("tag matches = %o", matches);
    if (matches.length == 4 &&
        !matches[1] && matches[2] && !matches[3]) {
        // Transform FOO-42
        // into [FOO-42](https://host.com/browse/FOO-42)
        text = str_insert(text, posStart + matches.index + matches[0].length,
                          '](' + jira_projects[matches[2]] + '/browse/' + matches[0] + ')');
        text = str_insert(text, posStart + matches.index, '[');

        // Fast-forward to the end of the replacement:
        posStart += matches.index + matches[0].length * 2 + jira_projects[matches[2]].length + 12;
    } else {
      posStart += matches.index + matches[0].length;
    }
  }

  posStart = 0;
  // urlRegexp:
  // $1 Check for "](" - we *don't* want those matches as they are entered as a link.
  // $2 The whole URL; start with https, contain "/browse/" and the issue number.
  // $3 The matched URL stem.
  // $4 The issue number, a series of CAPS followed by a dash followed by digits.
  // $5 The project name.
  // $6 Any trailing "/" will make us ignore the match.
  var jiraUrlsOred = Object.values(jira_projects).join('|');
  var urlRegexp = new RegExp(String.raw`(\]\()?((` + jiraUrlsOred + String.raw`)\/browse\/((`
                             + projectNamesOred + String.raw`)-\d+)\b([)\/])?)`);
  while (matches = text.slice(posStart).match(urlRegexp)) {
    logIfDebug("matches = %o", matches);
    if (matches.length == 7 &&
        !matches[1] && matches[2] && matches[3] && matches[4] && matches[5] && !matches[6]) {
        // Transform https://host.com/browse/FOO-42
        // into [FOO-42](https://host.com/browse/FOO-42)
        text = str_insert(text, posStart + matches.index + matches[2].length, ')');
        text = str_insert(text, posStart + matches.index, '[' + matches[4] + '](');

        // Fast-forward to the end of the replacement:
        posStart += matches.index + matches[2].length +  matches[4].length + 4;
    } else {
      posStart += matches.index + matches[0].length;
    }
  }
  return text;
}


export function setup(helper) {
  helper.addPreProcessor(text => {
    return linkJiraUrl(text, helper.getOptions().jira_projects);
  } );
}
