/**
 * Database Seeder
 * Run this once to populate the database with sample questions
 * Usage: node seed.js
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

const questions = [
  {
    title: 'Two Sum',
    difficulty: 'easy',
    tags: ['arrays', 'hash-map'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers such that they add up to target.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

**Constraints:**
- 2 ≤ nums.length ≤ 10⁴
- -10⁹ ≤ nums[i] ≤ 10⁹
- Only one valid answer exists.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9, so return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6',
      },
    ],
    testCases: [
      { input: '4\n2 7 11 15\n9', expectedOutput: '0 1' },
      { input: '3\n3 2 4\n6', expectedOutput: '1 2' },
      { input: '2\n3 3\n6', expectedOutput: '0 1' },
      { input: '5\n1 5 3 2 4\n7', expectedOutput: '1 3' },
    ],
    starterCode: {
      javascript: `// Read input from stdin
const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
const n = parseInt(lines[0]);
const nums = lines[1].split(' ').map(Number);
const target = parseInt(lines[2]);

function twoSum(nums, target) {
    // Write your solution here
    // Return indices as space-separated string like "0 1"
}

console.log(twoSum(nums, target));`,
      python: `import sys
lines = sys.stdin.read().strip().split('\\n')
n = int(lines[0])
nums = list(map(int, lines[1].split()))
target = int(lines[2])

def two_sum(nums, target):
    # Write your solution here
    # Return indices as space-separated string like "0 1"
    pass

print(two_sum(nums, target))`,
      cpp: `#include<bits/stdc++.h>
using namespace std;

int main(){
    int n;
    cin >> n;
    vector<int> nums(n);
    for(int i = 0; i < n; i++) cin >> nums[i];
    int target;
    cin >> target;
    
    // Write your solution here
    // Print indices as "i j"
    
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for(int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();
        
        // Write your solution here
        // Print indices as "i j"
    }
}`,
    },
  },
  {
    title: 'Reverse a String',
    difficulty: 'easy',
    tags: ['strings'],
    description: `Write a function that reverses a string. The input is given as a single line string.

**Constraints:**
- 1 ≤ s.length ≤ 10⁵
- s consists of printable ASCII characters.`,
    examples: [
      { input: 'hello', output: 'olleh' },
      { input: 'Hannah', output: 'hannaH' },
    ],
    testCases: [
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'world', expectedOutput: 'dlrow' },
      { input: 'abcde', expectedOutput: 'edcba' },
      { input: 'a', expectedOutput: 'a' },
    ],
    starterCode: {
      javascript: `const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();

function reverseString(s) {
    // Write your solution here
}

console.log(reverseString(s));`,
      python: `s = input().strip()

def reverse_string(s):
    # Write your solution here
    pass

print(reverse_string(s))`,
      cpp: `#include<bits/stdc++.h>
using namespace std;
int main(){
    string s;
    cin >> s;
    // Write your solution here
    // Print the reversed string
    return 0;
}`,
      java: `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        // Write your solution here
        // Print the reversed string
    }
}`,
    },
  },
  {
    title: 'FizzBuzz',
    difficulty: 'easy',
    tags: ['math', 'strings'],
    description: `Given an integer \`n\`, print the numbers from 1 to n with the following rules:
- If the number is divisible by **3**, print \`Fizz\`
- If the number is divisible by **5**, print \`Buzz\`
- If divisible by **both 3 and 5**, print \`FizzBuzz\`
- Otherwise, print the number itself

Each result should be on a new line.

**Constraints:** 1 ≤ n ≤ 100`,
    examples: [
      {
        input: 'n = 5',
        output: '1\n2\nFizz\n4\nBuzz',
        explanation: '3 is divisible by 3 → Fizz, 5 is divisible by 5 → Buzz',
      },
    ],
    testCases: [
      { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz' },
      { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' },
      { input: '3', expectedOutput: '1\n2\nFizz' },
      { input: '1', expectedOutput: '1' },
    ],
    starterCode: {
      javascript: `const n = parseInt(require('fs').readFileSync('/dev/stdin', 'utf8').trim());

for(let i = 1; i <= n; i++) {
    // Write your solution here
}`,
      python: `n = int(input())
for i in range(1, n+1):
    # Write your solution here
    pass`,
      cpp: `#include<bits/stdc++.h>
using namespace std;
int main(){
    int n; cin >> n;
    for(int i = 1; i <= n; i++){
        // Write your solution here
    }
    return 0;
}`,
      java: `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for(int i = 1; i <= n; i++){
            // Write your solution here
        }
    }
}`,
    },
  },
  {
    title: 'Maximum Subarray',
    difficulty: 'medium',
    tags: ['arrays', 'dynamic-programming'],
    description: `Given an integer array \`nums\`, find the **contiguous subarray** (containing at least one number) which has the largest sum and return its sum. This is the classic **Kadane's Algorithm** problem.

**Constraints:**
- 1 ≤ nums.length ≤ 10⁵
- -10⁴ ≤ nums[i] ≤ 10⁴`,
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: '[4,-1,2,1] has the largest sum = 6.',
      },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5,4,-1,7,8]', output: '23' },
    ],
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
      { input: '1\n1', expectedOutput: '1' },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23' },
      { input: '4\n-3 -2 -1 -4', expectedOutput: '-1' },
    ],
    starterCode: {
      javascript: `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
const n = parseInt(lines[0]);
const nums = lines[1].split(' ').map(Number);

function maxSubArray(nums) {
    // Implement Kadane's Algorithm
}

console.log(maxSubArray(nums));`,
      python: `import sys
lines = sys.stdin.read().strip().split('\\n')
n = int(lines[0])
nums = list(map(int, lines[1].split()))

def max_sub_array(nums):
    # Implement Kadane's Algorithm
    pass

print(max_sub_array(nums))`,
      cpp: `#include<bits/stdc++.h>
using namespace std;
int main(){
    int n; cin >> n;
    vector<int> nums(n);
    for(int i=0;i<n;i++) cin >> nums[i];
    // Implement Kadane's Algorithm
    cout << 0 << endl;
    return 0;
}`,
      java: `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for(int i=0;i<n;i++) nums[i] = sc.nextInt();
        // Implement Kadane's Algorithm
        System.out.println(0);
    }
}`,
    },
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'medium',
    tags: ['stack', 'strings'],
    description: `Given a string \`s\` containing just the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\` and \`]\`, determine if the input string is **valid**.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.

Print \`true\` if valid, \`false\` otherwise.`,
    examples: [
      { input: '()', output: 'true' },
      { input: '()[]{}', output: 'true' },
      { input: '(]', output: 'false' },
    ],
    testCases: [
      { input: '()', expectedOutput: 'true' },
      { input: '()[]{}', expectedOutput: 'true' },
      { input: '(]', expectedOutput: 'false' },
      { input: '([)]', expectedOutput: 'false' },
      { input: '{[]}', expectedOutput: 'true' },
    ],
    starterCode: {
      javascript: `const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();

function isValid(s) {
    // Use a stack!
}

console.log(isValid(s));`,
      python: `s = input().strip()

def is_valid(s):
    # Use a stack!
    pass

print(str(is_valid(s)).lower())`,
      cpp: `#include<bits/stdc++.h>
using namespace std;
int main(){
    string s; cin >> s;
    // Use a stack!
    cout << "false" << endl;
    return 0;
}`,
      java: `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        // Use a stack!
        System.out.println("false");
    }
}`,
    },
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coding_arena');
    console.log('✅ Connected to MongoDB');

    // Clear existing questions
    await Question.deleteMany({});
    console.log('🗑️  Cleared existing questions');

    // Insert new questions
    const inserted = await Question.insertMany(questions);
    console.log(`✅ Seeded ${inserted.length} questions successfully!`);

    console.log('\n📋 Questions seeded:');
    inserted.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.difficulty.toUpperCase()}] ${q.title}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database seeding complete! You can now start the server.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
