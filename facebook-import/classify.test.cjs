// Self-contained test suite for the poem classifier.
// Run: node classify.test.cjs   (exits non-zero on failure)

const assert = require("assert");
const {
  classifyPoem,
  detectLanguage,
  extractTitle,
  textToHtml,
  htmlToComparable,
  textToComparable,
} = require("./classify.cjs");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok: ${name}`);
  } catch (e) {
    console.error(`  FAIL: ${name}\n     ${e.message}`);
    process.exitCode = 1;
  }
}

// ---------- fixtures ----------

const greekPoem = `Η θάλασσα

Η θάλασσα μιλά τη νύχτα
με φωνή αλμυρή και κρύα
τα κύματα χτυπούν την πέτρα
σαν καρδιά που δεν ησυχάζει

Κι εγώ ακούω απ' το παράθυρο
το τραγούδι της να με καλεί`;

const englishPoem = `Morning Light

The sun climbs slow above the hill
and paints the sleeping valley gold,
a blackbird tunes its morning trill,
the night lets go its silver hold.

I stand alone with steaming cup
and watch the whole world waking up.`;

const proseGreek = `Καλημέρα σε όλους τους φίλους μου! Σήμερα είχα μια υπέροχη μέρα στην πόλη με την οικογένειά μου. Πήγαμε σε ένα ωραίο εστιατόριο και μετά περπατήσαμε στο πάρκο. Ο καιρός ήταν εξαιρετικός και περάσαμε πολύ όμορφα όλοι μαζί. Ελπίζω να είχατε κι εσείς μια όμορφη μέρα!`;

const linkShare = `Check out my new poetry collection!
Available now at the link below:
https://example.com/book
Thank you all for your support
It means the world to me`;

const shortGreeting = `Χρόνια πολλά!
Με αγάπη,
Παύλος`;

const noTitlePoem = `τα χρόνια περνούν σαν το νερό
που τρέχει στο ποτάμι
κι εμείς μετράμε τις στιγμές
με δάκρυα και γέλια
μα η αγάπη μένει πάντα
σαν βράχος στο κύμα`;

// ---------- classifyPoem ----------

console.log("classifyPoem:");
test("greek poem accepted", () => assert.strictEqual(classifyPoem(greekPoem).isPoem, true));
test("english poem accepted", () => assert.strictEqual(classifyPoem(englishPoem).isPoem, true));
test("greek prose rejected", () => assert.strictEqual(classifyPoem(proseGreek).isPoem, false));
test("link share rejected", () => assert.strictEqual(classifyPoem(linkShare).isPoem, false));
test("short greeting rejected", () => assert.strictEqual(classifyPoem(shortGreeting).isPoem, false));
test("empty rejected", () => assert.strictEqual(classifyPoem("").isPoem, false));
test("untitled poem accepted", () => assert.strictEqual(classifyPoem(noTitlePoem).isPoem, true));

// ---------- detectLanguage ----------

console.log("detectLanguage:");
test("greek detected", () => assert.strictEqual(detectLanguage(greekPoem), "greek"));
test("english detected", () => assert.strictEqual(detectLanguage(englishPoem), "english"));
test("polytonic greek detected", () => assert.strictEqual(detectLanguage("ἄνδρα μοι ἔννεπε μοῦσα πολύτροπον"), "greek"));

// ---------- extractTitle ----------

console.log("extractTitle:");
test("short first line becomes the title", () => {
  const { title, body } = extractTitle(greekPoem);
  assert.strictEqual(title, "Η θάλασσα");
  assert.ok(body.startsWith("Η θάλασσα μιλά"));
});
test("english title extracted", () => {
  const { title } = extractTitle(englishPoem);
  assert.strictEqual(title, "Morning Light");
});
test("untitled poem gets a derived title", () => {
  const { title, body } = extractTitle(noTitlePoem);
  assert.ok(title.length > 0 && title.length <= 70, `title was: ${title}`);
  assert.strictEqual(body, noTitlePoem); // whole text kept as body
});
test("quoted title is unwrapped", () => {
  const { title } = extractTitle(`«Το φεγγάρι»\n\nline one here\nline two here\nline three\nline four`);
  assert.strictEqual(title, "Το φεγγάρι");
});

// ---------- textToHtml / round trip ----------

console.log("textToHtml:");
test("lines become <p> tags, blanks become <p><br></p>", () => {
  const html = textToHtml("line one\n\nline two");
  assert.strictEqual(html, "<p>line one</p><p><br></p><p>line two</p>");
});
test("html special chars escaped", () => {
  assert.ok(textToHtml("a < b & c > d").includes("a &lt; b &amp; c &gt; d"));
});
test("dedupe round-trip: html of text compares equal to original text", () => {
  const body = "στίχος ένα\nστίχος δύο\n\nστίχος τρία";
  assert.strictEqual(htmlToComparable(textToHtml(body)), textToComparable(body));
});

console.log(`\n${passed} tests passed${process.exitCode ? " (WITH FAILURES)" : ""}`);
