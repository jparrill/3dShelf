#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * Test Coverage Report Script
 *
 * This script analyzes the Jest coverage report and provides
 * insights about test coverage across the codebase.
 */

const COVERAGE_DIR = path.join(__dirname, '..', 'coverage')
const SUMMARY_FILE = path.join(COVERAGE_DIR, 'coverage-summary.json')

function readCoverageSummary() {
  try {
    const content = fs.readFileSync(SUMMARY_FILE, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error('❌ Coverage summary not found. Run "npm run test:coverage" first.')
    process.exit(1)
  }
}

function formatPercentage(value) {
  const percentage = value.pct
  const emoji = percentage >= 90 ? '🟢' : percentage >= 80 ? '🟡' : '🔴'
  return `${emoji} ${percentage.toFixed(1)}%`
}

function printCoverageReport(summary) {
  const { total } = summary

  console.log('\n📊 Test Coverage Report')
  console.log('========================\n')

  console.log('Overall Coverage:')
  console.log(`  Lines:      ${formatPercentage(total.lines)}     (${total.lines.covered}/${total.lines.total})`)
  console.log(`  Functions:  ${formatPercentage(total.functions)} (${total.functions.covered}/${total.functions.total})`)
  console.log(`  Branches:   ${formatPercentage(total.branches)}  (${total.branches.covered}/${total.branches.total})`)
  console.log(`  Statements: ${formatPercentage(total.statements)} (${total.statements.covered}/${total.statements.total})`)

  console.log('\n📁 File Coverage Breakdown:')
  console.log('============================')

  // Get file-level coverage
  const files = Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .sort(([, a], [, b]) => a.lines.pct - b.lines.pct)

  files.forEach(([filePath, coverage]) => {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath)
    console.log(`\n${relativePath}:`)
    console.log(`  Lines: ${formatPercentage(coverage.lines)}`)

    if (coverage.lines.pct < 80) {
      const uncoveredLines = coverage.lines.total - coverage.lines.covered
      console.log(`    ⚠️  ${uncoveredLines} uncovered lines`)
    }
  })

  // Coverage recommendations
  console.log('\n💡 Recommendations:')
  console.log('===================')

  const lowCoverageFiles = files.filter(([, coverage]) => coverage.lines.pct < 80)

  if (lowCoverageFiles.length > 0) {
    console.log('\n📝 Files needing attention (< 80% coverage):')
    lowCoverageFiles.forEach(([filePath, coverage]) => {
      const relativePath = path.relative(path.join(__dirname, '..'), filePath)
      console.log(`  - ${relativePath} (${coverage.lines.pct.toFixed(1)}%)`)
    })
  }

  if (total.branches.pct < 80) {
    console.log('\n🔀 Branch coverage is below threshold. Consider adding tests for:')
    console.log('   - Error handling paths')
    console.log('   - Conditional logic branches')
    console.log('   - Switch/case statements')
  }

  if (total.functions.pct < 80) {
    console.log('\n🔧 Function coverage is below threshold. Consider adding tests for:')
    console.log('   - Utility functions')
    console.log('   - Event handlers')
    console.log('   - Lifecycle methods')
  }

  // Success message
  const allAbove80 = [
    total.lines.pct,
    total.functions.pct,
    total.branches.pct,
    total.statements.pct
  ].every(pct => pct >= 80)

  if (allAbove80) {
    console.log('\n🎉 Excellent! All coverage metrics are above 80%')
  }

  console.log('\n📖 View detailed coverage report:')
  console.log(`   open ${path.join(COVERAGE_DIR, 'lcov-report', 'index.html')}`)
  console.log('')
}

function main() {
  const summary = readCoverageSummary()
  printCoverageReport(summary)
}

if (require.main === module) {
  main()
}

module.exports = { readCoverageSummary, printCoverageReport }