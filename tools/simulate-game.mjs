import { writeFileSync, mkdirSync } from 'node:fs';
import { MAJORS } from '../src/domain/catalog.js';
import { STRATEGIES, simulateYear } from './simulation/run.js';
import { CONTENT_VERSION } from '../src/domain/state.js';
import { balance } from '../src/domain/balance.js';
const seeds = process.argv.includes('--quick') ? [1107] : [1107, 2213];
const results = [];
for (const major of Object.keys(MAJORS))
  for (const strategy of Object.keys(STRATEGIES))
    for (const seed of seeds) {
      const { result } = simulateYear({ major, strategy, seed });
      results.push(result);
      console.log(
        `${major} / ${strategy} / ${seed}: GPA ${result.gpa1}, ${result.gpa2}; tasks ${result.completed}/${result.completed + result.expired}; fatigue ${result.fatigueWeeks}; accepted ${result.admissions}`,
      );
    }
mkdirSync('.local', { recursive: true });
writeFileSync(
  '.local/balance-report.json',
  JSON.stringify(
    {
      contentVersion: CONTENT_VERSION,
      balance,
      strategies: STRATEGIES,
      seeds,
      assumptions:
        'Perfect task puzzles and interview answers, same lawful event choices, one cleaning slot on inspection weeks. Portfolio targets dream; others target balanced. No shop purchases or part-time work. This measures game rules, not human enjoyment or live-server random distributions.',
      results,
    },
    null,
    2,
  ),
);
console.log(`Saved ${results.length} runs to .local/balance-report.json`);
