# Possible cause in bug reports

A bug report may suggest a **possible cause** under Actual result when the captured Business Central message names one. The suggestion is derived assistance and never replaces the captured message. The recognition and the texts are in `src/bug-report/error-cause.js` (`T9ErrorCause`).

## Principles

- The suggestion is marked **Not confirmed** in every view and export.
- Its text names only what the captured message itself names, such as the permission, object, field and table. Nothing is invented. When the message does not name a field, there is no required-value suggestion.
- It is shown in the report view only. It goes into the PDF, Markdown and issue package only when the user ticks **Include when the report is sent or exported** (`causeHint.include`). **Doesn't fit, hide** sets `causeHint.dismissed`, and **Show again** clears it. Both choices are kept when the report is regenerated.
- The first cause that matches wins. The primary error is checked first, then the other captured errors.
- The suggestion is written in the interface language in the report view and in the document language in exports. Templates exist for all registered languages. A template is used only when every value it needs was captured.

## Business Central's own error messages, in every language

`src/bug-report/error-labels.js` holds Business Central's wording of common errors in all registered languages, taken from Microsoft's translations of the Base Application. A captured message in any language that matches one of them gets the same kind, so each cause and its checks are written once per kind, in `error-cause.js`, for every language. Suggestions from the Base Application's labels quote no names: the captured message is shown right above them.

- `%1`, `%2`… in a label match the values Business Central filled in. A backslash is a line break.
- A label with at least 25 characters of fixed text may appear inside a longer message, because a field error puts the field and the record around it. A shorter label, such as "%1 %2 is blocked.", must be the whole message or a whole line of it.
- When several labels match, the one with the longest fixed text wins, so a blocked dimension combination is not taken for a blocked record.
- Labels are checked before the rules below.

| Kind | Business Central's message, in English |
| --- | --- |
| `posting-date` | … is not within your range of allowed posting dates |
| `nothing-to-post` | There is nothing to post … |
| `out-of-balance` | … is out of balance by … |
| `already-scheduled` | … cannot be posted because it has already been scheduled for posting … |
| `not-on-inventory` | You have insufficient quantity of Item … on inventory; … is not on inventory; … is not available in inventory … |
| `dimension-blocked` | The combination of dimensions used in … is blocked. |
| `posting-setup-missing` | Inventory posting setup missing for location code … |
| `record-blocked` | … is blocked. |

### Common errors with a concrete cause

These kinds are recognized from the Base Application's labels or, when another Microsoft app shows them (the number series errors are in Business Foundation), from the known errors below. Unlike the kinds above, they name values from the message: the KINDS entry in the build script says which `%n` is which name (`{ pattern, params }`), and the label is stored as `[label, params]`. A name of several values that has other words between them in a language, such as the French "document %1 achat %2", is quoted with those words, exactly as the message has it. Each kind has its wording with and without the names, and three checks, in every language.

| Kind | Business Central's message, in English | Names |
| --- | --- | --- |
| `number-series` | You cannot assign new numbers from the number series %1 … | series |
| `posted-number-used` | Cannot post the … because its ID, %1, is already assigned to a record … | number |
| `dimension-mandatory` | Select a %1 for the %2 %3 for %4 %5. | dimension, record |
| `item-tracking-required` | You must assign a lot/serial/package number for item %1. | item |
| `item-tracking-mismatch` | … in the item tracking assigned to the document line for item … is currently … | none |
| `approval-required` | … must be approved and released before you can perform this action; Cannot post … pending approval | none |
| `duplicate-external-doc` | Purchase %1 %2 already exists for this vendor. | document |
| `nothing-to-handle` | (There is n/N)othing to handle … | none |
| `warehouse-handling-required` | Warehouse handling is required for …; Warehouse %1 is required for … | none |
| `accounting-period-missing` | No accounting periods have been set up …; the deferral schedule falls outside the accounting periods … | none |

A suggestion read from Microsoft's wording also says, under Why is this suggested?, which Business Central version the wording was compared with (`businessCentral` in `error-labels.js`, major and minor of the Base Application).

## The platform's own messages, in every language

Messages from the Business Central platform itself are not in the Base Application. They come from the server's language resources: `Service/<culture>/Microsoft.Dynamics.Nav.Language.resources.dll` in Microsoft's platform artifact (`sandbox/<version>/platform` on bcartifacts, under `ServiceTier/PFiles64/…/Service/`). `scripts/dotnet-resources.js` reads them. Each message has the same resource name in every language, and `PLATFORM` in the build script says which value is the field, the table, the record or the permission. A suggestion can therefore quote those names from the captured message, in any language.

- A platform message must start a line of the captured message. Its values are read in the order that language gives them.
- The message is recognized up to the end of the sentence or line that holds the last value that is read. Advice after that, such as a session ID or a help page, may change between versions.
- Quotes around a value are removed. A value with quotes inside, such as `No.='10000'`, keeps them. Invisible characters that some translations contain are removed.

| Resource | Kind | Names quoted |
| --- | --- | --- |
| `FieldMustBeNonblank` | required-value | field, table, record |
| `FieldMustBeEqualTo` | field-must-equal | field, expected value, current value |
| `RecordNotFoundError` | record-missing | table, record |
| `RelatedRecordNotFound` | related-missing | field, value, related table |
| `DuplicateKeyError` | record-exists | table, record |
| `ThisOrAnotherUserChangedTheDataError`, `ThisUserChangedTheDataError`, `ODataConcurrencyCheckErrorMessage` | changed-by-other | table |
| `DeadLockError`, `DeadLockErrorNoTable` | deadlock | table |
| `MissingPermissions`, `MissingPermissionsForCompany`, `MissingSystemPermissions` | permission | object, permission |
| `MissingLicensePermissions`, `MissingLicensePermissionsForCompany` | license-permission | object, permission |
| `00095-50063` | not-an-option | value, choices |
| `SuperRoleRequired`, `ScheduledTasksNotAllowed`, `CannotInsertTableRecords`, `ErrorNoExecutePermission` | permission | none |
| `HttpRequestError`, `HttpRequestErrorWithRequestError`, `HttpDefaultError`, `TimeoutExceptionString`, `RequestTimedOut`, `Message_CommunicationErrorTimedOut`, `ConnectionNotAvailableDescription`, `JsonRPC_GenericConnectionError`, `JsonRPC_TimeoutError`, `CrmConnectionFailure`, `CrmOpenConnectionTimeout`, `GraphConnectionFailure` | network-unavailable | none |

### Rebuilding the table

Run the whole routine with one command when a new Business Central version comes out:

```bash
node --max-old-space-size=8192 scripts/update-bc-tables.js <version, such as 29.1.57326.58379> <work folder outside the repository>
```

`scripts/update-bc-tables.js` reads, with HTTP range requests, each registered language's country artifact (`sandbox/<version>/<country>`) for its Base Application and Microsoft's other apps (not tests, demo data, tools or language packs), and the platform artifact for the language resources. It keeps them in `<work folder>/<version>` and does not fetch a file again that is already there. Then it runs `build-bc-captions.js` and `build-error-labels.js`. Review the diff and run the tests afterwards. The steps below are what it does.

The table is generated. Do not edit it by hand. It is built from the same packages as `bc-captions.json` (Microsoft_Base Application_<version>.app per country) and from the platform's language resources, one `<culture>.dll` per language. The resources can be read from the platform artifact with HTTP range requests, about 2.5 MB per language instead of the whole artifact of over 1 GB. The same run writes `error-known.json`. Its fourth folder holds Microsoft's other apps, taken from the `Applications.*/` and `Extensions/` folders of a country artifact. A ready-to-run package in `Extensions/` is an outer zip with the real .app inside. The current table was built from the artifacts `sandbox/29.1.57326.58379/<country>` for us, se, dk, de, fr, es, fi and no, about 100 MB of apps in one folder: the W1 apps once, plus each country's local apps. Run the script with `node --max-old-space-size=8192`, because it reads all the apps. Never commit the packages or the resource files.

```bash
node --max-old-space-size=8192 scripts/build-error-labels.js <folder with us.app se.app fr.app de.app es.app dk.app fi.app no.app> <folder with en-US.dll sv-SE.dll fr-FR.dll de-DE.dll es-ES.dll da-DK.dll fi-FI.dll nb-NO.dll> <platform version> <folder with Microsoft's other .app files>
```

To add a kind:
1. Add its English wording to `KINDS`, or its resource name and values to `PLATFORM`, in the script.
2. Add its text, three checks and, for a new kind, its wording with and without the names to every language in `error-cause.js`.
3. Rebuild the table.

`tests/bug-report-cause-followup.test.mjs` checks these things:
- Every label and platform message in every language is recognized as its kind.
- Nearly every known error in every language is recognized with its origin (a sample of every 20th message), and the origin and actions reach the box, Markdown and PDF.
- The names are read from the right values.
- Every kind is worded in every language.
- Business Central's real wording works, with its quotes and the advice after the names.

## Every error of Microsoft's apps: where it comes from and what Microsoft offers

`src/bug-report/error-known.json` holds every error message that Microsoft's AL source shows, about 6,100 messages from 101 apps in every registered language:

- the Base Application, including the errors that only one country's version has, such as the French SIRET number check, in that country's language and English;
- Microsoft's other apps for the countries of the registered languages: the W1 apps, and each country's local apps, such as DK Core, OIOUBL, FI Core, ELSTER, FEC Audit File, SAF-T for Norway, SIE and the US IRS forms.

Each message records:

- its wording in each language, from the app's own translation files;
- the object and app that show it, such as `Codeunit "Sales-Post"` in Base Application;
- the actions Microsoft offers in the error, such as **Open Fabric platform setup** (`ErrorInfo.AddAction` and `AddNavigationAction`), in each language.

`src/bug-report/al-errors.js` finds the errors in the source. A label counts as an error when it is the message of `Error(...)`, the second argument of `FieldError(...)`, or the message of an `ErrorInfo`, directly or through `StrSubstNo(...)`. A Notification also has a message and actions, but it is not an error and is left out.

Some errors are raised by a helper procedure. The caller passes the message, and the actions as a call that returns them, as the number series errors do: `Throw(StrSubstNo(CannotAssignNewErr, Code), Code, NoSeriesErrorsImpl.OpenNoSeriesLinesAction())`. A helper is a procedure that raises one of its Text parameters as an error. An action procedure adds a caption label to a dictionary. The error belongs to the calling object, and the caption to the action procedure's object. Only helpers in the same app are followed. The label's translation unit is found from the "Xliff Generator" note, such as `Codeunit Sales-Post - NamedType X`. Objects for tests and demo data are left out, as are actions that only hide the message (Don't show again) and action captions with a value in them.

How it is used:
- When a captured message matches a known error, the box shows **Probably shown by** with the object and app, and **Actions offered in the error message** with Microsoft's captions. Both go into the exports when the user includes the cause. A cause from the tables above keeps its own wording and gets the origin too.
- When no other cause matches, the cause is `known-error`: a check in Microsoft's app stopped the action, with three general checks. It says *probably*, because a label can have the same wording as another one, and an extension could use the same wording.
- A message is compared in full only with labels whose longest fixed piece it contains, so it takes about a millisecond. A label with almost no fixed text, such as "No %1 for %2 %3.", is too general to be recognized.
- The table is about 3.6 MB, so it is not in the service worker's scripts or the PDF bundle. The report page and the background load it with `T9ErrorCause.loadKnown()` before a report is shown or packaged. The cause then carries its origin and its action captions in every language, so an export does not need the table. Without the table, a report works as before, with no origin.

## The user's own apps

Under Settings → Bug reports → Your own apps, a user adds the .app files of partner apps or their own extensions. `src/ui/app-errors-settings.js` reads each file in the browser with `src/bug-report/app-errors.js`, the same code that `build-error-labels.js` uses for Microsoft's apps, and `src/bug-report/al-errors.js` for the AL source. Only the app's name, publisher, version, a table of its errors like `error-known.json` and a table of the captions of its pages, actions and fields like `bc-captions.json` (`src/document/app-captions.js`, for the knowledge rules of the app; see [BC_PUBLIC_KNOWLEDGE_CATALOG.md](BC_PUBLIC_KNOWLEDGE_CATALOG.md)) are kept, under `t9_known_app_errors` in `chrome.storage.local`. Nothing is sent. `T9ErrorCause.loadKnown()` reads the apps again each time, so an app added or removed counts at the next error, and compares a message with Microsoft's table first and then the user's apps.

- An app with its AL source (`src/*.al`, when the publisher allows it) gives its errors and actions as for Microsoft's apps.
- An app without source gives the labels named as errors (`…Err`, as AL's guidelines ask), without actions. The list says so, because some of them may be used for other messages.
- An app without error messages is still added when it names pages, actions or fields; the settings say so. A file that is not an app, or an app with neither, is not added, and the settings say why.
- Adding an app with the same publisher and name again replaces it. Remove has Undo.

## The recording panel

While a bug report is recorded, the background works out the possible cause of each captured error (`lastErrorCause` on the session) and the recording panel shows Business Central showed an error with the cause and its origin. The panel names the latest error only, and its status is announced once per error. The checks are in the report.

## Other wording (rules)

The rules recognize what the table does not have. They come after the table.

| Rule | Kind | Recognizes | Languages |
| --- | --- | --- | --- |
| `permission-prevented-en` | permission | `(TableData 18 Customer Read: …)` in a permission error | English wording, object types in any language |
| `permission-following-en` / `-sv` | permission | "You do not have the following permissions on X: Y" | English, Swedish |
| `permission-word` | permission | permission wording without names | English, Swedish |
| `required-value-en` / `-sv` | required-value | "X must have a value in Y: record" | English, Swedish |
| `http-rejected` | network-rejected | HTTP status 4xx | any |
| `http-unavailable` | network-unavailable | HTTP status 5xx | any |
| `connection-failed` | network-unavailable | connection failed or timed out | English, Swedish |

## Known gaps

- The tables follow the version they were built from: Base Application, Microsoft's apps and platform 29.1. See `source` and `platformSource` in the file. The first 16 platform messages had the same wording in platform 26.18; the 16 added later were checked in 29.1 only. A message that Microsoft rewords later is not recognized until the table is rebuilt. The rules still recognize the English and Swedish wording.
- Partner apps are not in the tables. A user can add their .app files in the settings (below); an app without its AL source is read from its label names, without actions.
- Only the countries of the registered languages are included. Apps for other countries, such as the Netherlands or Italy, are not. A country's local errors are recognized in its language and English only, as Microsoft translates them. Apps that Microsoft does not translate show their actions in English.
- Microsoft's actions are found when the action is added to the error in the same procedure as its message, or through a helper in the same app. The Base Application offers very few actions on its errors (about 20 in its source), so most of its errors have an origin but no actions.
- The platform's own messages about a failed connection, a timeout or a missing permission are recognized in every language. Other wording of a failed connection, and the permission wording without a company ("You do not have the following permissions on X: Y"), are recognized only in English and Swedish by the rules.
- The texts of the causes in French, German, Spanish, Danish, Finnish and Norwegian were written for BC Process Studio and follow Business Central's terms. No native speaker has reviewed them yet.
- A suggestion is advice for the message, not a diagnosis. Learning from the user's own resolved reports is proposed as a later step.
