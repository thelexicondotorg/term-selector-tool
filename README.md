# The Lexicon - Term Selector Tool

## Run remotely

Visit

https://thelexicondotorg.github.io/term-selector-tool/

## Run locally

```
python -m http.server 8000
```

then visit http://localhost:8000


## Overview

TST is a JavaScript library that automatically highlights specific
terms within a webpage and displays interactive popup cards with
detailed information fetched from the Lexicon Airtable database.

### Key Features

- **Automatic term detection**: It scans page content and highlights
  matching terms from a glossary. Search is case-insensitive.
- **Airtable integration**: It fetches term definitions and its
  metadata in real-time from Airtable. Whatever update in Airtable is
  immediately reflected in the online result.
- **Interactive popups**: It displays flip-card popups with term details on click.
- **Channel-based filtering**: Terms are search only within the
  specified channel.
- **Term exclusion**: Terms can be excluded via a meta tag.
- **Preview of terms**: It is provided with a `foundTerms()` function
  to list all the unique terms found in a page.


### Requirements and usage

Here is a minimal configuration:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Required meta tags -->
    <meta name="tst-parent-taxonomy" content="Design">
    <meta name="tst-excluded-terms" content="">
    
    <link rel="stylesheet" href="thelexicon-tst.css">
</head>
<body>
    <!-- Content container with required class -->
    <div class="thelexicon-tst">
        <p>Your content with terms to highlight goes here.</p>
    </div>
    
    <script src="thelexicon-tst.js"></script>
    <script>document.addEventListener('DOMContentLoaded', () => { highlightTerms();});</script>
</body>
</html>
```

### Meta Tags

TST requires two meta tags in the `<head>` section of your HTML document.

#### `tst-parent-taxonomy`

Defines the channel used to filter which terms should be highlighted on the page.

```html
<meta name="tst-parent-taxonomy" content="CHAD">
```

#### `tst-excluded-terms`

Specifies which terms should not be highlighted even if they exist in
the glossary for the current channel and if they are found in the
page.

- It must be a comma separated list of words. 
- It can be empty.
- It can contain a single world.
- Capitalization and extra spaces are ignored. Excluding " Logo " will
  also exclude "logo", "Logo" and "LOGO".

**Examples:**

```html
<!-- Exclude single term -->
<meta name="tst-excluded-terms" content="hunger">

<!-- Exclude multiple terms -->
<meta name="tst-excluded-terms" content="hunger, Fresh Food Farmacy">

<!-- No exclusions (empty) -->
<meta name="tst-excluded-terms" content="">
```


### Content Selector

The library looks for content within an element with the class `.thelexicon-tst`. Only text within this container will be scanned for term highlighting.

```html
<div class="thelexicon-tst">
    <!-- All content here will be scanned for terms -->
    <article>
        <h1>Understanding Design Systems</h1>
        <p>A design system is a collection of reusable components...</p>
    </article>
</div>

<!-- Content outside will NOT be scanned -->
<footer>
    <p>This content is ignored by TST.</p>
</footer>
```

### Public Functions

#### `highlightTerms()`

The main function that scans the page content and highlights all matching terms.

```javascript
await highlightTerms();
```

**Behavior:**
1. Retrieves the channel from `tst-parent-taxonomy` meta tag
2. Fetches all terms for that channel from Airtable
3. Filters out excluded terms from `tst-excluded-terms`
4. Scans all text nodes within `.thelexicon-tst`
5. Wraps matching terms in clickable `<span>` elements.

### Debug Functions

#### `foundTerms()`

A debugging utility that can be used to identify which terms for the
curent channel are present in the current page. It displays
results in an alert dialog for easy copy-paste.

Open the Developer Toolbar and type:

```javascript
foundTerms();
```


#### `termsByChannel(channel)`

It fetches all the terms belonging to specified specific channel from Airtable.

```javascript
const terms = await termsByChannel("CHAD");
console.log(terms);
```

## 5 Airtable Integration

### Configuration Constants

The library uses three constants for Airtable connection (defined at the top of the script):

```javascript
const BASE_ID = 'appFTGzhkyFj0r9r1';
const TABLE_ID = 'tblAuOlHMAQPjdhGM';
const PAT_TOKEN = 'pat...'; // the Personal Access Token
```

Make sure that the Personal Access Token provides read-only access to
the table.

### Required Table Structure

Your Airtable table must contain the following fields:

| Field Name       | Type                   | Description                             |
|------------------|------------------------|-----------------------------------------|
| `TERM`           | Single line text       | The term name (used for matching)       |
| `CHANNEL`        | Multiple select        | Categories/channels the term belongs to |
| `Final SVG`      | Attachment             | SVG graphic for the term                |
| `Definition`     | Long text              | The term's definition                   |
| `DesignerLookup` | Linked record / Lookup | Designer name                           |
| `Nationality`    | Lookup                 | Designer's nationality                  |


## Popup System

### Template File

The popup content is loaded from an external `popup.html` file. This
file should be placed in the same directory as your main HTML page.

### Available Placeholders

The template supports the following placeholders that are replaced with actual data:

| Placeholder               | Description                   |
|---------------------------|-------------------------------|
| `{{channel}}`             | Current channel name          |
| `{{finalSvg}}`            | URL to the term's SVG image   |
| `{{term}}`                | The term name                 |
| `{{definition}}`          | Term definition               |
| `{{designer}}`            | Designer name                 |
| `{{designerNationality}}` | Designer's nationality        |
| `{{otherChannelsHtml}}`   | HTML for related channel tags |
