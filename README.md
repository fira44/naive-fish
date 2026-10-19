# Naive Fish

**A fish that learns what to eat, using nothing but a Naive Bayes classifier.**

Things keep dropping into an aquarium: flakes, worms, toxic algae, a suspicious red pill, plastic bags, air bubbles. The fish starts out clueless. It tastes things, watches its HP go up or down, and updates its probabilities. Over a few minutes it learns what is **food**, what is **poison** and what is **junk**, and you can watch its beliefs change live above its head.

Pure HTML, CSS and vanilla JavaScript. No build step, no dependencies. Open `index.html` and it runs.

## Why this exists

Naive Bayes is easy to write down and hard to *feel*. This project makes the two classic ideas visible:

- **Laplace smoothing.** Turn it off, drop a Red pill the fish has never seen, and the fish freezes: every class gets probability 0 and the classifier has no answer. Turn it on and the fish approaches carefully instead of locking up.
- **Exploration.** The fish only learns from things it eats. If it wrongly decides something is dangerous it will avoid it forever, unless it sometimes tries anyway.

## Run it

```
git clone https://github.com/fira44/naive-fish.git
cd naive-fish
```

Then double-click `index.html`. To host it, enable GitHub Pages on the repository (Settings, Pages, deploy from the `main` branch root).

## How it works

### The world

Each object has four binary features:

| Feature | Looks like |
|---|---|
| Bright | glowing, saturated color (otherwise dull) |
| Moving | wiggling or swaying sideways |
| Small | small (otherwise twice the size) |
| Rising | floats up (otherwise sinks) |

Objects belong to one of three classes, which the fish cannot see directly:

| Class | HP when eaten | Objects |
|---|---|---|
| Food | +10 | flake, worm |
| Poison | -20 | toxic algae, red pill |
| Junk | 0 | plastic bag, air bubble |

Each object type has a hidden probability for every feature (see `OBJECT_TYPES` in `world.js`), so two worms rarely look identical. The noise is deliberate: the fish has to learn probabilities, it cannot memorize shapes.

### The brain

The fish keeps counts and nothing else:

```
classTotals[class]            how many objects of this class it has eaten
counts[class][feature][value] how often each feature value appeared in that class
```

After eating something, the HP change tells it the true class and the counters are incremented. To classify a new object:

```
P(class)             = (classTotals[class] + a) / (total + 3a)
P(feature | class)   = (counts[class][feature][value] + a) / (classTotals[class] + 2a)
score(class)         = P(class) * product over features of P(feature | class)
P(class | features)  = score(class) / sum of all scores
```

`a` is the Laplace smoothing constant: `1` when smoothing is on, `0` when it is off. The `2a` in the denominator is there because each feature has two possible values, so the two probabilities still sum to 1.

Example: the fish ate 10 foods and none was bright. Without smoothing, `P(bright | food) = 0 / 10 = 0`, and one zero wipes out the whole product. With smoothing it is `(0 + 1) / (10 + 2) = 0.083`: unlikely, not impossible.

### The decision

When an object enters its field of view, the fish classifies it once and picks a behavior:

| Situation | Behavior |
|---|---|
| Food is the most likely class | eat it |
| No class reaches 50% | unsure: approach carefully |
| Poison is the most likely class | avoid it |
| Junk is the most likely class | ignore it |
| All probabilities are 0 (smoothing off) | freeze |
| Would avoid or ignore, but the exploration roll hits | taste it anyway |

The exploration roll is `Math.random() < explorationRate` (12% by default).

## Controls

- **Laplace smoothing**: switch `a` between 1 and 0.
- **Exploration rate**: 0 to 40%. At 0% the fish can get stuck with a wrong belief forever.
- **Speed**: 0.5x to 3x simulation speed.
- **Reset fish brain**: wipe all counts and start over.
- **Drop an object**: throw a specific object into the tank.

Above the fish a panel shows its live probabilities for the object it is looking at. Below the tank, a table shows everything it has learned so far.

### Stats

- **HP**: eat food to heal, poison hurts. At 0 the fish faints and revives with 50 HP.
- **Recent (last 30 decisions)**: share of the last 30 decisions that were right. A decision is right if the fish approached food, or stayed away from something that was not food. This is the learning curve.
- **Accuracy (food / eaten)**: foods eaten divided by everything eaten since the last reset. It equals the unsmoothed `P(food)` taken straight from the counters.

## Things to try

1. Leave smoothing on and watch **Recent** climb as the table fills in.
2. Turn smoothing off, press **Reset fish brain**, drop a **Red pill** and watch it lock.
3. Set exploration to 0% and see whether the fish ever finds out that worms are food.
4. Set exploration to 40% and watch it poison itself while learning.
5. Edit the probabilities in `OBJECT_TYPES` to make the world easier, noisier or more confusing.

## Project layout

```
index.html   page and controls
style.css    styling
bayes.js     NaiveBayes class (counts, Laplace smoothing, prediction); no DOM code
world.js     object types, hidden feature probabilities, spawning and physics
draw.js      canvas drawing: tank, objects, fish, probability panel
main.js      fish behavior, learning loop, HUD and controls
```

`bayes.js` has no browser dependencies and exports itself under Node, so it can be tested on its own:

```js
const NaiveBayes = require('./bayes.js');
const nb = new NaiveBayes(3, 4);
for (let i = 0; i < 10; i++) nb.learn([0, 0, 1, 0], 0);
nb.likelihood(0, 0, 1, 0); // 0       without smoothing
nb.likelihood(0, 0, 1, 1); // 0.0833  with smoothing
```
