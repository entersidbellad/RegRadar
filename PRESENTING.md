# Presenting RegRadar: 15-minute talk track

For: Eduardo at IDC, Partner Operations & AI Automation Intern interview.
Demo: the Vercel deployment of this branch (demo mode: sample data, no backend, no API keys).

| Section | Time | Goal |
|---|---|---|
| 1. The problem | 0:00–2:00 | Why this matters, in one picture |
| 2. Live demo | 2:00–8:30 | One rule change, from alert to to-do list |
| 3. How it was built, and my part | 8:30–11:30 | Honest about the team, clear about what I did |
| 4. How this maps to partner ops at IDC | 11:30–14:00 | The same pattern, applied to his world |
| 5. Closer: Argon AERMOD | 14:00–15:00 | Show range, then hand it back to him |

---

## Before you start

- Open the demo in a fresh private window so the guided tour auto-starts on the dashboard. If it doesn't, click **Take the tour** in the top bar.
- Use a desktop browser at 100% zoom. The tour works on a phone, but the analysis panel is easier to read on a laptop.
- Click through the tour once beforehand so the map tiles are cached.
- Keep https://argon-aermod.vercel.app open in a second tab.
- Tour controls: **Next**, **Back**, **Skip tour**, or the arrow keys. **Escape** closes the tour.
- If you'd rather drive the app yourself, skip the tour and click in the same order. The steps below work either way.

---

## 1. The problem (0:00–2:00)

> North Carolina is the second-largest hog-producing state in the country. There are more than 2,300 animal feeding operations, and most of them sit in a handful of eastern counties like Duplin and Sampson.
>
> Every one of these farms runs under environmental permits, and the rules behind those permits change. They change through new EPA rules, court decisions, and deadline extensions. The rules are long, too: the core federal rule for these farms runs to about 80,000 words of legal text.
>
> Big operators have compliance teams and lawyers. A family farm with 3,000 hogs doesn't. When a rule changes, they find out late, or they have to pay someone to read it for them. Penalties can reach tens of thousands of dollars a day.
>
> At HackDuke our question was: can we watch the rules, work out which farms each change affects, and tell each farm in plain English what it needs to do?

Show the landing page while you say this, then click **Take the guided tour**.

---

## 2. Live demo (2:00–8:30)

Follow the tour. Each step below says what's on screen and what to say. Don't read the tooltip out loud. Let him read it, and you add the color.

**Dashboard: what RegRadar watches** (steps 1–3, about 1 minute)
- "These are 15 real hog farms taken from North Carolina's permit records, along with the 9 federal EPA rules that apply to them."
- On the map: "Each dot is a farm, colored by its latest check. Most are gray because in this demo only one farm has a saved analysis. I'll come back to that."

**Alerts: a rule change comes in** (steps 4–5, about 1 minute)
- "This is the moment that matters operationally. A court ruling struck down three permit conditions. RegRadar raises an alert, rates its severity, and names the farms it applies to."
- "Nobody has to cross-check every rule against every farm. The matching is the automation."

**The affected farms → Calvin L. Rouse Farm** (steps 6–8, about 1 minute)
- "The three affected farms are highlighted. Let's open Calvin L. Rouse Farm: 2,883 hogs in Duplin County, on the state's general permit."

**Running the analysis** (step 9, about 30 seconds)
- "In the full version, this button sends the whole rule to Google's Gemini model in two passes. First it pulls out every requirement. Then it checks each requirement against this specific farm. On the public demo I'm showing a result the AI produced earlier, because the live version needs an API key and a backend I don't expose publicly."

**Reading the result** (steps 10–13, about 2 minutes. This is the payoff, so slow down.)
- Risk level: "The verdict is 'Needs review'. The farm looks mostly in line, but some things can't be confirmed from its records. There are 7 gaps, 7 actions, 76 requirements, and 13 of them have deadlines."
- Gaps: "These are specific to this farm, not generic advice. For example: is the permit renewal filed 180 days before expiry? Do the lagoons have the required depth markers?"
- Actions: "Each gap becomes a checklist item the farmer or a consultant can tick off."
- Requirements: "And here's the rule itself, translated. Each item has a plain-English summary, the exact legal citation, and any deadline or penalty. This is what turns hundreds of pages into something you can act on."

**Wrap** (step 14, about 15 seconds)
- "That's the loop: a rule changes, the affected farms get flagged, and each one gets a plain-English to-do list."

---

## 3. How it was built, and my part (8:30–11:30)

> This was a two-person HackDuke project, built over one weekend.
>
> **How it works**, in four pieces:
> 1. **Data.** We pulled the 9 relevant EPA rules from the Federal Register's public API, using each rule's document ID. We took the farm profiles from North Carolina's permit data.
> 2. **AI analysis in two passes.** Pass one reads the rule and extracts every requirement with its legal citation. Pass two compares those requirements with one farm's profile. Splitting the work made the output much more specific than asking for everything at once. The model has to return structured data that matches a fixed format, and it runs at a low temperature so it doesn't improvise legal citations.
> 3. **Caching.** Every result is saved, so the same farm-and-rule pair never costs a second AI call.
> 4. **The app.** A web dashboard: map, alerts, facility pages, reports and CSV export.
>
> **My part.** My teammate Sasank built the backend, the data collection and the prompts. I built the product people actually use: the full frontend redesign. That's the dashboard, map, facility pages, alerts, reports, search and dark mode, plus the UX for running an analysis (the progress indicator, cached-result handling, color-coded severity). I also wrote the script that pre-computes analyses for all 15 farms.
>
> **After the hackathon**, on my own fork, I turned it into something I could show anyone. I fixed a crash in the database setup script. I built this demo mode, which runs the whole app from static sample data with no server and no secrets, and deployed it with security headers. I added the guided tour. I did that work with an AI coding agent: I scoped each change, reviewed it, and checked it end to end before it shipped. That's how I like to use AI. It does the legwork, and I own the judgment and the checking.

Be precise here. If he asks "did you write the AI part?", the answer is no. Sasank wrote the prompts and the backend. You designed and built everything a user touches, and you own the demo version.

---

## 4. How this maps to partner operations at IDC (11:30–14:00)

Keep it about the pattern, and frame it as how you'd approach the job, not as claims about how IDC works today. Ask him one question at the end.

> What RegRadar really does is a common operations problem: **a stream of changes, a list of accounts, and a team that has to work out who is affected and what to do about it.**
>
> | RegRadar | Partner operations |
> |---|---|
> | New or changed rules | Changes to partner agreements, program terms, pricing, deliverables or deadlines |
> | 15 farm profiles | Partner records: tier, region, contract, what they've bought |
> | "Which farms does this rule affect?" | "Which partners does this change touch?" |
> | Severity rating on alerts | Triage: what needs action this week and what is just an FYI |
> | Plain-English gap analysis and checklist | A short brief per partner, with the next actions and owners |
> | Caching and saved results | Don't pay to redo work. Keep an audit trail of what was sent and why. |
>
> Three things I'd bring from this project:
> 1. **Split the AI's job into small, checkable steps.** Extract first, then decide. Each step is easier to test, and when something goes wrong you can see where.
> 2. **Structured output, not prose.** If the AI returns data in a fixed format, it can feed a spreadsheet, a CRM or a ticket queue directly instead of someone copying and pasting.
> 3. **A human signs off on anything that leaves the building.** The AI drafts the brief and flags the gaps. A person approves it. That's also how you build trust in the automation over time.
>
> A first project I could picture: take one recurring manual task, like routing partner requests or preparing partner update emails, automate the drafting, and measure the time saved against a human-reviewed sample.

Then ask: **"Where does your team spend the most time on manual follow-up today?"** Listen, and connect your answer to whatever he says.

---

## 5. Closer: Argon AERMOD (14:00–15:00)

Switch to the second tab.

> One more thing, because it's the same instinct from my own field. I'm a chemical and process engineer, and I've worked at cement, lime and steel plants. AERMOD is the model the EPA requires for estimating where pollution from a plant's stack lands. It decides whether a plant can switch fuels or build a new stack. It's written in Fortran, and few teams can maintain it or plug it into modern software.
>
> In Argon AERMOD, an AI model translated EPA's Fortran into Python. Nobody edited that code by hand. I built the checks: every EPA test case runs through both the original and the Python version, the results are compared hour by hour, and there's a file-by-file trace back to the AI requests that wrote each file. On top of that sits a simple question a plant manager actually asks: "Can we burn more alternative fuel and stay within our air limits?" The answer is within, close, or over.
>
> Same idea as RegRadar: take something technical and high-stakes, let AI do the heavy lifting, prove the output is right, and give the decision-maker one clear answer.

Then stop and hand it back: "Happy to go deeper on any of it."

---

## Likely questions

**Is the AI running live right now?**
No. The public demo runs on saved sample data, so it needs no server and no API key. The full version runs locally: it calls Gemini live for any farm and any rule, which takes from under a minute to a few minutes depending on the rule's length, then caches the result.

**How do you stop the AI from making things up?**
Four guardrails. It's told to extract only what the rule explicitly says, and to return nothing if the rule doesn't apply. It works in two narrow passes instead of one big one. It must return a fixed structure with legal citations. It runs at low temperature. What we haven't done yet is measure accuracy against a lawyer-reviewed answer key, and that would come next.

**Why two passes instead of one prompt?**
One prompt gave vague, generic advice. Extracting the requirements first gave the model a concrete checklist to compare the farm against, and the gap analysis started naming the farm's actual size, permit and deadlines.

**What did you build versus your teammate?**
Sasank built the backend, data pipeline and prompts. I built the whole user-facing app, the analysis UX and the batch pre-caching script. On my fork I also did the demo mode, the deployment, the tour and a database fix.

**How long did it take?**
The core was built over the HackDuke weekend. The demo hardening and the tour came afterwards.

**What does it cost to run?**
Each new analysis is two Gemini Flash calls, which fits within the free tier (about 250 requests a day). Because every result is cached, re-opening an analysis costs nothing.

**How do the rules get in? Is it monitoring live?**
Not yet. We pulled the 9 rules from the Federal Register's API by document ID, as a snapshot. A scheduled job that checks the Federal Register for new documents would be the next step.

**How are alerts generated?**
In this version, the four alerts are curated sample data. There's a written prompt for classifying which farms an alert affects and how severe it is, but it isn't connected to the app yet.

**What would you build next?**
In this order: connect automatic alert classification; add a scheduled check for new rules; add North Carolina's state permit and rules, which matter as much as the federal ones; build a small human-reviewed test set to measure accuracy; and add a review queue so a person approves each brief before it goes out.

**How do you use AI tools day to day?**
As a fast pair of hands that I check. I write down the goal and the constraints, let the agent do the first pass, then review the change and verify it myself: run the build, click through the flow, check the network calls. This demo was hardened that way.

**Is it secure?**
The public demo has no server, no database and no secrets. It serves static files and sample data, with standard security headers. The live version keeps the API key server-side in an environment file that never goes into the repository.

---

## Honest limits (say these before he finds them)

- **Live AI analysis only runs locally.** The Vercel demo shows one saved analysis: Calvin L. Rouse Farm against the core federal permit rule. The other 14 farms show "Not analyzed." The batch script can pre-compute all 15, but that wasn't run for this demo.
- **The alerts are sample data.** The four alerts were written for the demo to show the flow. Treat them as illustrations and check any of them before citing it as fact.
- **The rules are a snapshot, not live monitoring.** There are 9 federal EPA rules and no scheduled checks. State rules, including North Carolina's general permit for hog farms, aren't loaded yet.
- **15 farms, not 2,300.** The pipeline isn't tied to that number, but the demo covers 15.
- **The AI makes mistakes.** We've seen it invent an analysis date (the demo now shows the real one), write some deadlines as free text, and produce a few summaries that just restate the rule. Its confidence score is its own estimate, not a measured accuracy.
- **There's no accuracy benchmark yet.** Nobody has graded the results against a compliance expert's answers.
- **The search index is built but unused.** The backend builds a semantic search index of the rules. The current two-pass analysis sends the whole rule to Gemini instead, so the index isn't used for analysis yet.
- **It's not legal advice, and there are no accounts or notifications.** It's a decision aid. There are no logins, and nothing is emailed or texted.

---

## If something goes wrong

- **The tour gets stuck or a page loads slowly:** click **Next**. Each step waits up to 8 seconds for the page, then carries on. You can also click **Skip tour** and drive the app manually in the same order.
- **The map tiles don't load** (for example, on a blocked network): the dots and the rest of the app still work. Keep talking about the alert and the analysis.
- **The Wi-Fi drops completely:** keep a local copy ready. Before the interview, build it once while you're online with `cd frontend && bun install && NEXT_PUBLIC_USE_MOCKS=true bun run build` (the build downloads the font, so it needs a connection). If the Wi-Fi drops, run `bun run start` in `frontend/` and open http://localhost:3000. Everything except the map tiles works offline.
