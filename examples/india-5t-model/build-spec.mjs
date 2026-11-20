// Builds spec.json for the 8-10 minute video "What if India builds a 5 trillion parameter model?"
// Facts carry a source line. Anything marked "Scenario" is a projection, not a forecast or news.
// Run: node examples/india-5t-model/build-spec.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const scenes = [
  {
    id: "hook",
    kicker: "SCENARIO · NOVEMBER 2026",
    narration:
      "Right now, the best AI model on Earth is Claude Fable 5.2. Now imagine a model built in India, with five trillion parameters, that beats it on the major tests. This video is a scenario, not a news report. Here is what it would change, and where the facts end and the projections begin.",
    headline: "Imagine a model built in India",
    visual: [{ type: "bigNumber", text: "5T", color: "red", at: "five", y: 330, size: 280 }],
    source: "Scenario. Facts are sourced on each scene.",
  },
  {
    id: "leaderboard",
    kicker: "WHAT IS REAL TODAY",
    narration:
      "Start with the facts. On November 20, 2026, the BenchLeader index ranks Claude Fable 5.2 first, with a score of 70.1. GPT-6.2 Astra sits second at 68.2, and Gemini 4 Carbon third at 68.0.",
    headline: "Claude Fable 5.2 leads",
    visual: [
      {
        type: "hbarChart", x: 420, y: 360, maxWidth: 1000,
        bars: [
          { label: "Claude Fable 5.2", value: 70.1, color: "red", at: "70.1" },
          { label: "GPT-6.2 Astra", value: 68.2, color: "ink", at: "Astra" },
          { label: "Gemini 4 Carbon", value: 68.0, color: "grey", at: "Carbon" },
        ],
      },
    ],
    source: "Source: BenchLeader Index, standings as of 20 Nov 2026 (benchleader.com).",
  },
  {
    id: "catch",
    kicker: "THE SIZE PROBLEM",
    narration:
      "Here is the catch. Neither OpenAI nor Anthropic publishes the parameter counts of its newest models. Parameters are the learned numbers inside a model, and outside estimates are all anyone has.",
    headline: "Nobody publishes parameter counts",
    visual: [{ type: "bigNumber", text: "?", color: "red", at: "catch", y: 330, size: 300 }],
    source: "Source: kingy.ai model comparison, 2026 (vendors disclosed no parameter counts for GPT-5.5 or Claude Opus 4.7).",
  },
  {
    id: "biggest-open",
    kicker: "THE LARGEST OPEN MODEL",
    narration:
      "The biggest open-weight model you can download is DeepSeek V4-Pro. It has about 1.6 trillion parameters, and it activates about 49 billion of them for each token it generates.",
    headline: "DeepSeek V4-Pro",
    visual: [{ type: "bigNumber", text: "1.6T", color: "ink", at: "1.6", y: 330, size: 280 }],
    source: "Source: aiwiki.ai parameter comparison, reported specs for the April 2026 MIT-licensed release.",
  },
  {
    id: "three-x",
    kicker: "THE SCALE",
    narration:
      "So a five trillion parameter model would be about three times the size of DeepSeek V4-Pro. That is the scale this video is about.",
    headline: "about three times the size",
    visual: [
      {
        type: "barChart", x: 560, w: 800, baselineY: 900, maxHeight: 480,
        bars: [
          { label: "DeepSeek V4-Pro", value: 1.6, color: "ink", at: "DeepSeek" },
          { label: "India 5T (scenario)", value: 5, color: "red", at: "three" },
        ],
      },
    ],
    source: "Source: parameter counts as reported. Scenario figure: 5 trillion.",
  },
  {
    id: "memory",
    kicker: "WHAT IT TAKES",
    narration:
      "Holding five trillion numbers takes memory. At one byte per parameter, the weights alone need five terabytes. At standard 16-bit precision, that doubles to ten terabytes.",
    headline: "five terabytes",
    visual: [
      {
        type: "card", title: "WEIGHTS ONLY", x: 560, y: 380, w: 800,
        rows: [
          { label: "8-bit (1 byte per parameter)", value: "5 TB", valueAt: "five", color: "red" },
          { label: "16-bit (2 bytes per parameter)", value: "10 TB", valueAt: "ten", color: "ink" },
        ],
      },
    ],
    source: "Arithmetic: 5 trillion parameters times bytes per parameter. Excludes activations and cache.",
  },
  {
    id: "sparse",
    kicker: "WHY IT COULD BE FAST",
    narration:
      "The trick is sparse design. A mixture of experts model wakes only a slice of its network for each token. If five trillion parameters activate around one hundred billion per token, the model runs far cheaper than a dense model of the same size.",
    headline: "wakes only a slice",
    visual: [{ type: "bigNumber", text: "100B", color: "red", at: "hundred", y: 330, size: 280 }],
    source: "Scenario assumption: 100 billion active parameters per token, versus 49 billion for DeepSeek V4-Pro.",
  },
  {
    id: "eka",
    kicker: "INDIA IS ALREADY BUILDING",
    narration:
      "India is not starting from zero. On November 3, 2026, the IndiaAI Mission released EKA-1, a 26.3 billion parameter model from Soket Labs, trained on about 7.5 trillion tokens.",
    headline: "EKA-1",
    visual: [{ type: "bigNumber", text: "26.3B", color: "ink", at: "26.3", y: 330, size: 260 }],
    source: "Source: Press Information Bureau release, 3 Nov 2026 (via newsonair.gov.in).",
  },
  {
    id: "dhir",
    kicker: "THE SMALL MODELS ALREADY WORK",
    narration:
      "Two smaller models arrived the same day. Dhir 2B and Dhir 5B run fully offline, even on a laptop. Their four-bit files weigh about one and three gigabytes, and they carry an open Apache license. That is proof that sovereign AI does not need a data center to start.",
    headline: "run fully offline",
    visual: [
      {
        type: "card", title: "DHIR MODELS", x: 460, y: 380, w: 1000,
        rows: [
          { label: "Dhir 2B, 4-bit file", value: "1.21 GB", valueAt: "one", color: "ink" },
          { label: "Dhir 5B, 4-bit file", value: "2.95 GB", valueAt: "three", color: "ink" },
          { label: "Laptop speed, Dhir 2B (vendor test)", value: "18.6 tokens per second", valueAt: "laptop", color: "red" },
        ],
      },
    ],
    source: "Source: ZenteiQ vendor figures, summarised in a Nov 2026 IndiaAI release write-up. Single-user speeds, not independently verified.",
  },
  {
    id: "plan",
    kicker: "THE NATIONAL PLAN",
    narration:
      "The plan goes further. Officials have said India will build twelve foundation models, each with fifty to one hundred twenty billion parameters.",
    headline: "twelve foundation models",
    visual: [
      {
        type: "card", title: "IndiaAI FOUNDATION MODEL PLAN", x: 460, y: 380, w: 1000,
        rows: [
          { label: "Foundation models planned", value: "12", valueAt: "twelve", color: "red" },
          { label: "Parameters per model", value: "50B to 120B", valueAt: "fifty", color: "ink" },
        ],
      },
    ],
    source: "Source: Union Budget 2026 remarks by Ashwini Vaishnaw, reported by Analytics India Magazine.",
  },
  {
    id: "jump",
    kicker: "THE JUMP",
    narration:
      "Going from 26 billion to five trillion is a jump of about 190 times. That is the leap this scenario asks you to imagine.",
    headline: "190 times",
    visual: [{ type: "bigNumber", text: "190x", color: "red", at: "190", y: 330, size: 280 }],
    source: "Arithmetic: 5,000 billion divided by 26.3 billion.",
  },
  {
    id: "day-one",
    kicker: "DAY ONE",
    narration:
      "Picture the morning it launches. Indian engineers release a model that tops the leaderboard. It is cheaper to run, quicker to answer, and open to download.",
    headline: "tops the leaderboard",
    visual: [
      {
        type: "hbarChart", x: 420, y: 360, maxWidth: 1000,
        bars: [
          { label: "India 5T (scenario)", value: 71.0, color: "red", at: "tops" },
          { label: "Claude Fable 5.2", value: 70.1, color: "ink", at: "leaderboard" },
        ],
        tag: { bar: 0, text: "#1", at: "tops" },
      },
    ],
    source: "Scenario score, not a measurement. Current leader: Claude Fable 5.2 at 70.1 (BenchLeader, 20 Nov 2026).",
  },
  {
    id: "speed",
    kicker: "WHAT CHANGES",
    narration:
      "Speed and price matter as much as the score. A fast model answers in moments, so banks, hospitals and schools can use it at scale. Cheap tokens let a small startup do what only a giant could afford before.",
    headline: "Speed and price",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "WHO GAINS", title: "Cheap, fast AI",
        items: [
          { text: "Banks and clinics run it on their own servers", at: "banks" },
          { text: "Startups stop paying a giant's prices", at: "startup" },
          { text: "Students get a tutor in their own language", at: "hospitals" },
        ],
      },
    ],
    source: "Scenario projection.",
  },
  {
    id: "money-spend",
    kicker: "PART 2 · THE MONEY",
    narration:
      "Now the money. Start with the spending. The four largest cloud companies plan roughly seven hundred billion dollars of capital spending on AI in 2026.",
    headline: "seven hundred billion dollars",
    visual: [{ type: "bigNumber", text: "$700B", color: "red", at: "seven", y: 330, size: 280 }],
    source: "Source: JP Morgan estimate of $697 billion for 2026 hyperscaler capex (reported by intellectia.ai). Axis Intelligence puts it at $725 billion.",
  },
  {
    id: "chips",
    kicker: "WHERE THE MONEY GOES",
    narration:
      "Most of that money buys chips, power and buildings. A model from India does not shrink that bill. It moves some demand to new buyers, and it changes which companies capture the revenue.",
    headline: "chips, power and buildings",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "SPENDING SPLIT", title: "Who collects",
        items: [
          { text: "Chip makers", at: "chips" },
          { text: "Power companies and grid builders", at: "power" },
          { text: "Data center builders", at: "buildings" },
          { text: "Model sellers, if they keep their prices", at: "revenue" },
        ],
      },
    ],
    source: "Qualitative projection based on where AI capex is currently spent.",
  },
  {
    id: "api-prices",
    kicker: "THE PRICE PRESSURE",
    narration:
      "Here is the first real effect. When a strong open model is free to download, the price of closed models falls. Every company that sells access to AI has to justify its margin again.",
    headline: "the price of closed models falls",
    visual: [
      {
        type: "barChart", x: 560, w: 800, baselineY: 900, maxHeight: 460,
        bars: [
          { label: "Claude Fable 5.2", value: 16, color: "red", at: "closed" },
          { label: "Gemini 4 Carbon", value: 4, color: "ink", at: "justify" },
          { label: "Gemini 4 Hydrogen", value: 3, color: "grey", at: "margin" },
        ],
      },
    ],
    source: "Source: BenchLeader blended price per 1M tokens, 20 Nov 2026. Price falls under the scenario are a projection.",
  },
  {
    id: "retention",
    kicker: "THE PART MOST PEOPLE MISS",
    narration:
      "Here is the part most people miss. One model does not set the exchange rate. Interest rates, oil prices and capital flows do most of the work. Keep that in mind as we go through the money.",
    headline: "The part most people miss",
    visual: [{ type: "stamp", text: "READ THIS", x: 620, y: 470, size: 110, color: "red", rotate: -4, at: "miss" }],
    source: "General explanation of exchange rate drivers.",
  },
  {
    id: "dollar",
    kicker: "PART 3 · THE DOLLAR",
    narration:
      "Next, the currency. The US dollar is strong right now. The dollar index sits near 104, close to a nineteen month high, because markets expect the Federal Reserve to keep raising rates.",
    headline: "The dollar index sits near 104",
    visual: [{ type: "bigNumber", text: "104", color: "red", at: "104", y: 330, size: 280 }],
    source: "Source: FXStreet and Reuters market reports, 19 to 20 Nov 2026. Index level near 103.8 to 104.0.",
  },
  {
    id: "why-dollar",
    kicker: "WHY THE DOLLAR STILL WINS",
    narration:
      "Why does the dollar stay strong? Because US markets are the deepest in the world, and most global trade and debt is priced in dollars. A rival model does not change that quickly. It takes years of trust, not one benchmark.",
    headline: "deepest in the world",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "WHY THE DOLLAR HOLDS", title: "Slow to change",
        items: [
          { text: "Deepest financial markets", at: "deepest" },
          { text: "Most trade and debt priced in dollars", at: "priced" },
          { text: "Years of trust, not one benchmark", at: "years" },
        ],
      },
    ],
    source: "General explanation. Dollar index context from FXStreet, 19 to 20 Nov 2026.",
  },
  {
    id: "rupee",
    kicker: "THE RUPEE",
    narration:
      "The rupee trades near ninety three to the dollar. Its recent record low, around ninety six point nine six, came in October.",
    headline: "The rupee trades near",
    visual: [
      {
        type: "card", title: "RUPEE PER US DOLLAR", x: 460, y: 380, w: 1000,
        rows: [
          { label: "20 Nov 2026", value: "about 93", valueAt: "ninety", color: "ink" },
          { label: "Record low, October 2026", value: "about 96.96", valueAt: "record", color: "red" },
        ],
      },
    ],
    source: "Source: Wise mid-market history (20 Nov 2026); BusinessWorld (October record low of 96.96).",
  },
  {
    id: "rupee-forces",
    kicker: "TWO FORCES",
    narration:
      "A breakthrough model pulls the rupee two ways. Foreign money chases Indian AI, and exporters earn more dollars from software and services. But India imports chips priced in dollars, and that spending pulls the other way.",
    headline: "pulls the rupee two ways",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "SCENARIO MECHANISM", title: "Rupee: two pulls",
        items: [
          { text: "More dollars in: foreign investment in Indian AI", at: "chases" },
          { text: "More dollars in: software and services exports", at: "exporters" },
          { text: "More dollars out: imported chips and servers", at: "imports" },
        ],
      },
    ],
    source: "Scenario mechanism. Direction only, not a measured effect.",
  },
  {
    id: "rupee-guess",
    kicker: "OUR BEST GUESS",
    narration:
      "Our projection is that the rupee gains some ground, perhaps a few percent over a year. The dollar index stays firm while the Fed tightens. Treat this as a range, not a forecast.",
    headline: "gains some ground",
    visual: [{ type: "stamp", text: "SCENARIO, NOT FORECAST", x: 520, y: 460, size: 84, color: "red", rotate: -4, at: "forecast" }],
    source: "Scenario judgement, based on the two forces above. Not financial advice.",
  },
  {
    id: "growth",
    kicker: "PART 4 · GROWTH",
    narration:
      "The IMF says global growth slows to about three percent in 2026. India is the fastest growing major economy, with 7.0 percent forecast for 2026 and 2027.",
    headline: "fastest growing major economy",
    visual: [
      {
        type: "barChart", x: 560, w: 800, baselineY: 900, maxHeight: 460,
        bars: [
          { label: "World", value: 3.0, color: "grey", at: "three" },
          { label: "China", value: 4.5, color: "ink", at: "fastest" },
          { label: "India", value: 7.0, color: "red", at: "7.0" },
        ],
      },
    ],
    source: "Source: IMF forecasts as reported by Financial Express (July 2026 update) and NDTV (October 2026). China figure from Rio Times.",
  },
  {
    id: "rank",
    kicker: "THE RANKING",
    narration:
      "India is now the sixth largest economy, according to the IMF. Its projected path puts it fourth by 2027, with about four point five two trillion dollars of GDP.",
    headline: "sixth largest economy",
    visual: [
      {
        type: "card", title: "INDIA'S ECONOMY", x: 460, y: 380, w: 1000,
        rows: [
          { label: "Rank in 2026", value: "6th", valueAt: "sixth", color: "ink" },
          { label: "Projected rank in 2027", value: "4th", valueAt: "fourth", color: "red" },
          { label: "Projected 2027 GDP", value: "$4.52T", valueAt: "four", color: "ink" },
        ],
      },
    ],
    source: "Source: IMF projections as reported by Financial Express (2026).",
  },
  {
    id: "hardware",
    kicker: "THE HARDWARE RACE",
    narration:
      "Who wins the hardware race? A five trillion parameter model needs huge memory and fast links between chips. That pulls demand toward chip makers, data centers and power grids, wherever they sit.",
    headline: "huge memory",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "WHO SUPPLIES IT", title: "Hardware demand",
        items: [
          { text: "Memory: 5 to 10 terabytes of weights", at: "memory" },
          { text: "Fast chip-to-chip links", at: "links" },
          { text: "Data centers and power grids", at: "grids" },
        ],
      },
    ],
    source: "Scenario projection. Memory figures from the arithmetic shown earlier.",
  },
  {
    id: "jobs",
    kicker: "JOBS AND SERVICES",
    narration:
      "For India, the biggest change may be in jobs. IT firms that sell outsourced coding could lose clients to a home-grown model. But demand for people who build, check and deploy AI could rise fast.",
    headline: "outsourced coding",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "JOBS", title: "Who feels it",
        items: [
          { text: "Outsourced coding: under pressure", at: "outsourced" },
          { text: "AI deployment and safety engineers: demand up", at: "deploy" },
          { text: "Data checking and evaluation: new work", at: "check" },
        ],
      },
    ],
    source: "Scenario projection.",
  },
  {
    id: "diplomacy",
    kicker: "PART 5 · DIPLOMACY",
    narration:
      "Now diplomacy. A sovereign model changes how countries bargain. A government that does not need to rent foreign AI can refuse conditions it dislikes.",
    headline: "changes how countries bargain",
    visual: [{ type: "stamp", text: "LEVERAGE", x: 620, y: 470, size: 120, color: "red", rotate: -5, at: "refuse" }],
    source: "Scenario projection.",
  },
  {
    id: "us-trade",
    kicker: "THE TRADE TALKS",
    narration:
      "The US and India agreed a trade framework in February, with an eighteen percent tariff on Indian goods. The Supreme Court then struck down the emergency tariffs that framework relied on, and signing is on hold until Washington sets a new tariff structure.",
    headline: "trade framework",
    visual: [
      {
        type: "card", title: "US AND INDIA TRADE", x: 460, y: 380, w: 1000,
        rows: [
          { label: "February 2026 framework", value: "18% tariff", valueAt: "eighteen", color: "ink" },
          { label: "Status, November 2026", value: "Signing on hold", valueAt: "signing", color: "red" },
          { label: "Trigger", value: "Supreme Court ruling", valueAt: "Supreme", color: "ink" },
        ],
      },
    ],
    source: "Source: ANI and The Hindu, 18 Nov 2026, quoting Commerce Secretary Rajesh Agrawal.",
  },
  {
    id: "export-rules",
    kicker: "CHIPS AND EXPORT RULES",
    narration:
      "Export controls decide who can buy the best chips. If the US tightens them, India's model still trains, but more slowly. If Washington eases them, India gets a faster path, and the US gains a partner instead of a rival.",
    headline: "Export controls",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "IF WASHINGTON...", title: "Two paths",
        items: [
          { text: "Tightens: India trains more slowly", at: "tightens" },
          { text: "Eases: India moves faster, and the US gains a partner", at: "eases" },
        ],
      },
    ],
    source: "Scenario projection.",
  },
  {
    id: "china",
    kicker: "THE WILD CARD",
    narration:
      "China is the wild card. US President Donald Trump arrived in China this week for talks with Xi Jinping. A capable Indian model would add a third option for countries that want AI without picking a side.",
    headline: "a third option",
    visual: [{ type: "stamp", text: "A THIRD OPTION", x: 560, y: 470, size: 110, color: "ink", rotate: -3, at: "third" }],
    source: "Source: Outlook India live update, 18 Nov 2026, on Trump's trip to China.",
  },
  {
    id: "global-south",
    kicker: "THE GLOBAL SOUTH",
    narration:
      "Many countries in Africa, Southeast Asia and Latin America need affordable AI in local languages. An open Indian model with strong Indic language skills could become their default. That shifts influence toward New Delhi.",
    headline: "affordable AI",
    visual: [{ type: "bigNumber", text: "22", color: "red", at: "affordable", y: 330, size: 300 }],
    source: "Source: PIB via newsonair.gov.in. EKA-1 covers all 22 scheduled Indian languages plus English. Influence shift is a scenario.",
  },
  {
    id: "losers",
    kicker: "WHO LOSES",
    narration:
      "Every shift creates losers. Closed model sellers would face price pressure. Countries that bet heavily on one supplier would need to rethink. And any open model can be misused, so safety rules and audits become a diplomatic topic.",
    headline: "Every shift creates losers",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "LOSERS", title: "Pressure points",
        items: [
          { text: "Closed model sellers: price pressure", at: "pressure" },
          { text: "Single-supplier bets: need to rethink", at: "rethink" },
          { text: "Safety and audit rules: become a treaty topic", at: "audits" },
        ],
      },
    ],
    source: "Scenario projection.",
  },
  {
    id: "reality",
    kicker: "PART 6 · THE REALITY CHECK",
    narration:
      "Now the reality check. EKA-1 is announced, but its weights are not public yet. The release is planned within a month, with a waitlist first.",
    headline: "not public yet",
    visual: [
      {
        type: "card", title: "EKA-1 STATUS", x: 460, y: 380, w: 1000,
        rows: [
          { label: "Parameters", value: "26.3B", valueAt: "announced", color: "ink" },
          { label: "Weights", value: "Waitlist, not public", valueAt: "public", color: "red" },
          { label: "Planned open release", value: "Within a month", valueAt: "month", color: "ink" },
        ],
      },
    ],
    source: "Source: PIB and Soket Labs, reported by TheTechBag, 3 to 20 Nov 2026.",
  },
  {
    id: "timeline",
    kicker: "THE SCENARIO TIMELINE",
    narration:
      "Here is one way the timeline could run. In 2027, independent labs test the Indian model and publish scores. In 2028, open weights spread, and a price war starts among API sellers. By 2030, a five trillion parameter system could sit inside banks, courts and classrooms across Asia.",
    headline: "one way the timeline could run",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "SCENARIO, NOT FORECAST", title: "2027 to 2030",
        items: [
          { text: "2027: independent tests and published scores", at: "2027" },
          { text: "2028: open weights spread, prices fall", at: "2028" },
          { text: "2030: banks, courts and classrooms adopt it", at: "2030" },
        ],
      },
    ],
    source: "Scenario timeline. Not a prediction of dates.",
  },
  {
    id: "myths",
    kicker: "THREE MYTHS",
    narration:
      "Three myths spread fast when a headline like this lands. Myth one: the dollar collapses overnight. Myth two: US AI companies disappear. Myth three: every job vanishes next year. None of these follows from a single model.",
    headline: "Three myths",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "MYTHS", title: "Not how it works",
        items: [
          { text: "The dollar collapses overnight", value: "NO", valueColor: "red", at: "collapses" },
          { text: "US AI companies disappear", value: "NO", valueColor: "red", at: "disappear" },
          { text: "Every job vanishes next year", value: "NO", valueColor: "red", at: "vanishes" },
        ],
      },
    ],
    source: "Scenario reasoning. Each claim needs far more than one model to be true.",
  },
  {
    id: "not-built",
    kicker: "THE HONEST GAP",
    narration:
      "I found no announcement of a five trillion parameter Indian model. Building one would take many months of training on a very large number of top chips, and funding at a scale India has not yet committed.",
    headline: "no announcement",
    visual: [{ type: "bigNumber", text: "0", color: "red", at: "found", y: 330, size: 300 }],
    source: "Source: search of November 2026 coverage. The training scale is a judgement, not a measured figure.",
  },
  {
    id: "likely",
    kicker: "THE MOST LIKELY PATH",
    narration:
      "Here is the most likely path. Indian models get better each year. Open models narrow the gap with closed ones. Prices fall. The rupee and the dollar move with interest rates more than with AI.",
    headline: "most likely path",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "PROJECTION", title: "Most likely",
        items: [
          { text: "Indian models improve every year", at: "Indian" },
          { text: "Open models close the gap", at: "narrow" },
          { text: "Prices fall", at: "fall" },
          { text: "Rates, not AI, drive the rupee and dollar", at: "rates" },
        ],
      },
    ],
    source: "Scenario judgement.",
  },
  {
    id: "watch",
    kicker: "THREE THINGS TO WATCH",
    narration:
      "Watch three signals. First, independent benchmarks of EKA-1. Second, the signing of the US and India trade deal. Third, the dollar index and the Federal Reserve's next decision.",
    headline: "Watch three signals",
    visual: [
      {
        type: "steps", x: 460, y: 380, w: 1000,
        items: [
          { text: "Independent benchmarks of EKA-1", tool: "1", at: "First" },
          { text: "US and India trade deal signed", tool: "2", at: "Second" },
          { text: "Dollar index and Fed decisions", tool: "3", at: "Third", highlight: true },
        ],
      },
    ],
    source: "Signals to watch, not predictions.",
  },
  {
    id: "you",
    kicker: "PART 7 · YOU",
    narration:
      "If you build products, your costs could fall fast. If you work in services, your skills need to move up the stack. If you save in rupees, watch the exchange rate, not the headlines.",
    headline: "watch the exchange rate",
    visual: [{ type: "bigNumber", text: "3", color: "red", at: "build", y: 330, size: 300 }],
    source: "General guidance. Not financial advice.",
  },
  {
    id: "summary",
    kicker: "THE SUMMARY",
    narration:
      "So what happens if India builds a five trillion parameter model that tops the charts? Prices fall, India gains leverage in diplomacy, and the rupee gets some support. The dollar stays strong while the Fed tightens.",
    headline: "Prices fall",
    visual: [
      {
        type: "paperCard", x: 460, y: 360, w: 1000, h: 480, kicker: "IF INDIA BUILDS IT", title: "The scenario in four lines",
        items: [
          { text: "Prices fall", at: "Prices" },
          { text: "India gains diplomatic leverage", at: "leverage" },
          { text: "The rupee gets some support", at: "rupee" },
          { text: "The dollar stays strong while the Fed tightens", at: "dollar" },
        ],
      },
    ],
    source: "Scenario summary. Not a forecast.",
  },
  {
    id: "close",
    kicker: "FACTS FIRST",
    background: "black",
    transition: "cut",
    narration:
      "Facts first, projections clearly labelled. If you want the next scenario, from China or from the US, tell us in the comments. And subscribe, so you do not miss it.",
    headline: "Facts first",
    visual: [{ type: "bigNumber", text: "SUBSCRIBE", color: "red", at: "subscribe", y: 330, size: 240 }],
    source: "",
  },
];

const spec = {
  title: "What if India builds a 5 trillion parameter model?",
  fps: 60,
  width: 1920,
  height: 1080,
  cadence: "smooth",
  fade: { in: 12, out: 22 },
  scenes: scenes.map((s, i) => {
    const scene = {
      id: s.id,
      narration: s.narration,
      elements: [
        { type: "typewriter", text: s.kicker },
        { type: "headline", text: s.headline, y: 110 },
        ...s.visual,
      ],
    };
    if (s.source) scene.source = s.source;
    if (s.background) scene.background = s.background;
    if (s.transition) scene.transition = s.transition;
    return scene;
  }),
};

const words = scenes.reduce((n, s) => n + s.narration.split(/\s+/).length, 0);
writeFileSync(path.join(here, "spec.json"), JSON.stringify(spec, null, 2) + "\n");
console.log(`scenes=${scenes.length} narration_words=${words} est_minutes_at_180wpm=${(words / 180).toFixed(1)}`);
