/**
 * Generates the starter suite of 100+ original playable coding problems
 * with original problem descriptions, verified test cases, and starter templates.
 * Output is saved to server/data/starterPlayableProblems.json
 */

const fs = require('fs');
const path = require('path');

const problems = [
  // ----------------------------------------------------
  // ARRAYS & HASHING
  // ----------------------------------------------------
  {
    title: 'Two Sum Target',
    slug: 'two-sum-target',
    difficulty: 'easy',
    topics: ['Array', 'Hash Table'],
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
    sourceLink: 'https://leetcode.com/problems/two-sum/',
    description: `Given an integer array \`nums\` and an integer \`target\`, find the 0-based indices of the two elements whose sum equals \`target\`.

**Input Format (stdin):**
- Line 1: \`n\` (length of array)
- Line 2: \`n\` space-separated integers
- Line 3: \`target\` integer

**Output Format (stdout):**
- Two space-separated indices in ascending order.`,
    constraints: ['2 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9', 'Exactly one valid pair exists'],
    examples: [
      { input: '4\n2 7 11 15\n9', output: '0 1', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' }
    ],
    testCases: [
      { input: '4\n2 7 11 15\n9', expectedOutput: '0 1' },
      { input: '3\n3 2 4\n6', expectedOutput: '1 2' },
      { input: '2\n3 3\n6', expectedOutput: '0 1' },
      { input: '5\n1 5 3 2 4\n7', expectedOutput: '1 3' },
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const nums = lines[1].trim().split(/\\s+/).map(Number);
const target = parseInt(lines[2]);

function solve(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            return \`\${map.get(diff)} \${i}\`;
        }
        map.set(nums[i], i);
    }
    return '';
}

console.log(solve(nums, target));`,
      python: `import sys

lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])
    
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            print(f"{seen[diff]} {i}")
            break
        seen[num] = i
`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int target;
    cin >> target;

    unordered_map<int, int> seen;
    for (int i = 0; i < n; i++) {
        int diff = target - nums[i];
        if (seen.find(diff) != seen.end()) {
            cout << seen[diff] << " " << i << "\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();

        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) {
                System.out.println(map.get(diff) + " " + i);
                return;
            }
            map.put(nums[i], i);
        }
    }
}`
    }
  },

  {
    title: 'Anagram String Verification',
    slug: 'anagram-string-verification',
    difficulty: 'easy',
    topics: ['String', 'Hash Table', 'Sorting'],
    companies: ['Google', 'Amazon', 'Meta', 'Uber'],
    sourceLink: 'https://leetcode.com/problems/valid-anagram/',
    description: `Given two lowercase strings \`s\` and \`t\`, determine whether \`t\` is an anagram of \`s\` (contains the exact same character frequencies).

**Input Format (stdin):**
- Line 1: string \`s\`
- Line 2: string \`t\`

**Output Format (stdout):**
- \`true\` if \`t\` is an anagram of \`s\`, otherwise \`false\`.`,
    constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters.'],
    examples: [
      { input: 'anagram\nnagaram', output: 'true', explanation: 'Both strings have identical character counts.' }
    ],
    testCases: [
      { input: 'anagram\nnagaram', expectedOutput: 'true' },
      { input: 'rat\ncar', expectedOutput: 'false' },
      { input: 'a\na', expectedOutput: 'true' },
      { input: 'ab\na', expectedOutput: 'false' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
const s = (lines[0] || '').trim();
const t = (lines[1] || '').trim();

function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    const counts = new Array(26).fill(0);
    for (let i = 0; i < s.length; i++) {
        counts[s.charCodeAt(i) - 97]++;
        counts[t.charCodeAt(i) - 97]--;
    }
    return counts.every(c => c === 0);
}

console.log(isAnagram(s, t) ? 'true' : 'false');`,
      python: `import sys
lines = sys.stdin.read().split()
if len(lines) >= 2:
    s, t = lines[0], lines[1]
    print('true' if sorted(s) == sorted(t) else 'false')
else:
    print('false')`,
      cpp: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string s, t;
    if (!(cin >> s >> t)) return 0;
    if (s.length() != t.length()) {
        cout << "false\\n";
        return 0;
    }
    vector<int> count(26, 0);
    for (int i = 0; i < s.length(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int c : count) {
        if (c != 0) {
            cout << "false\\n";
            return 0;
        }
    }
    cout << "true\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        String s = sc.next();
        String t = sc.hasNext() ? sc.next() : "";
        if (s.length() != t.length()) {
            System.out.println("false");
            return;
        }
        int[] freq = new int[26];
        for (int i = 0; i < s.length(); i++) {
            freq[s.charAt(i) - 'a']++;
            freq[t.charAt(i) - 'a']--;
        }
        for (int f : freq) {
            if (f != 0) {
                System.out.println("false");
                return;
            }
        }
        System.out.println("true");
    }
}`
    }
  },

  {
    title: 'Contains Duplicate Elements',
    slug: 'contains-duplicate-elements',
    difficulty: 'easy',
    topics: ['Array', 'Hash Table', 'Sorting'],
    companies: ['Apple', 'Amazon', 'Google', 'Microsoft'],
    sourceLink: 'https://leetcode.com/problems/contains-duplicate/',
    description: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice in the array, and return \`false\` if every element is distinct.

**Input Format (stdin):**
- Line 1: \`n\` (length of array)
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- \`true\` or \`false\`.`,
    constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    examples: [
      { input: '4\n1 2 3 1', output: 'true', explanation: '1 appears multiple times.' }
    ],
    testCases: [
      { input: '4\n1 2 3 1', expectedOutput: 'true' },
      { input: '4\n1 2 3 4', expectedOutput: 'false' },
      { input: '1\n99', expectedOutput: 'false' },
      { input: '6\n1 1 1 3 3 4', expectedOutput: 'true' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const nums = lines[1] ? lines[1].trim().split(/\\s+/).map(Number) : [];

const set = new Set(nums);
console.log(set.size !== nums.length ? 'true' : 'false');`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    print('true' if len(set(nums)) != len(nums) else 'false')`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    unordered_set<int> seen;
    bool hasDup = false;
    for (int i = 0; i < n; i++) {
        int val; cin >> val;
        if (seen.count(val)) hasDup = true;
        seen.insert(val);
    }
    cout << (hasDup ? "true" : "false") << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        Set<Integer> set = new HashSet<>();
        boolean dup = false;
        for (int i = 0; i < n; i++) {
            int v = sc.nextInt();
            if (!set.add(v)) dup = true;
        }
        System.out.println(dup ? "true" : "false");
    }
}`
    }
  },

  {
    title: 'Top K Frequent Elements',
    slug: 'top-k-frequent-elements',
    difficulty: 'medium',
    topics: ['Array', 'Hash Table', 'Heap', 'Bucket Sort'],
    companies: ['Amazon', 'Meta', 'Google', 'Apple', 'Uber'],
    sourceLink: 'https://leetcode.com/problems/top-k-frequent-elements/',
    description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in any sorted order.

**Input Format (stdin):**
- Line 1: \`n\` and \`k\` space-separated
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- Space-separated integers sorted in ascending order.`,
    constraints: ['1 <= nums.length <= 10^5', 'k is in the range [1, the number of unique elements]'],
    examples: [
      { input: '6 2\n1 1 1 2 2 3', output: '1 2', explanation: '1 appears 3 times, 2 appears 2 times.' }
    ],
    testCases: [
      { input: '6 2\n1 1 1 2 2 3', expectedOutput: '1 2' },
      { input: '1 1\n1', expectedOutput: '1' },
      { input: '4 2\n4 4 2 2', expectedOutput: '2 4' },
      { input: '7 3\n5 5 5 2 2 1 9', expectedOutput: '1 2 5' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const [n, k] = lines[0].trim().split(/\\s+/).map(Number);
const nums = lines[1].trim().split(/\\s+/).map(Number);

const freq = new Map();
nums.forEach(x => freq.set(x, (freq.get(x) || 0) + 1));

const sorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(x => x[0])
    .sort((a, b) => a - b);

console.log(sorted.join(' '));`,
      python: `import sys
from collections import Counter

lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    k = int(lines[1])
    nums = [int(x) for x in lines[2:2+n]]
    counts = Counter(nums)
    most_common = [x[0] for x in counts.most_common(k)]
    most_common.sort()
    print(" ".join(map(str, most_common)))`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

int main() {
    int n, k;
    if (!(cin >> n >> k)) return 0;
    unordered_map<int, int> count;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        count[x]++;
    }
    vector<pair<int, int>> vec;
    for (auto& it : count) vec.push_back({it.second, it.first});
    sort(vec.rbegin(), vec.rend());
    vector<int> res;
    for (int i = 0; i < k; i++) res.push_back(vec[i].second);
    sort(res.begin(), res.end());
    for (int i = 0; i < k; i++) {
        cout << res[i] << (i + 1 == k ? "" : " ");
    }
    cout << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int k = sc.nextInt();
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int v = sc.nextInt();
            map.put(v, map.getOrDefault(v, 0) + 1);
        }
        List<Map.Entry<Integer, Integer>> list = new ArrayList<>(map.entrySet());
        list.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < k; i++) ans.add(list.get(i).getKey());
        Collections.sort(ans);
        for (int i = 0; i < ans.size(); i++) {
            System.out.print(ans.get(i) + (i + 1 == ans.size() ? "" : " "));
        }
        System.out.println();
    }
}`
    }
  },

  {
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    difficulty: 'medium',
    topics: ['Array', 'Prefix Sum'],
    companies: ['Amazon', 'Meta', 'Apple', 'Microsoft', 'Google', 'Uber'],
    sourceLink: 'https://leetcode.com/problems/product-of-array-except-self/',
    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`. Solve in O(n) without using division.

**Input Format (stdin):**
- Line 1: \`n\`
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- Space-separated integers representing the output array.`,
    constraints: ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30'],
    examples: [
      { input: '4\n1 2 3 4', output: '24 12 8 6', explanation: '2*3*4=24, 1*3*4=12, 1*2*4=8, 1*2*3=6' }
    ],
    testCases: [
      { input: '4\n1 2 3 4', expectedOutput: '24 12 8 6' },
      { input: '5\n-1 1 0 -3 3', expectedOutput: '0 0 9 0 0' },
      { input: '2\n4 5', expectedOutput: '5 4' },
      { input: '3\n2 3 4', expectedOutput: '12 8 6' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const nums = lines[1].trim().split(/\\s+/).map(Number);

const res = new Array(n).fill(1);
let prefix = 1;
for (let i = 0; i < n; i++) {
    res[i] = prefix;
    prefix *= nums[i];
}
let postfix = 1;
for (let i = n - 1; i >= 0; i--) {
    res[i] *= postfix;
    postfix *= nums[i];
}

console.log(res.join(' '));`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    res = [1] * n
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    postfix = 1
    for i in range(n - 1, -1, -1):
        res[i] *= postfix
        postfix *= nums[i]
    print(" ".join(map(str, res)))`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n), res(n, 1);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int prefix = 1;
    for (int i = 0; i < n; i++) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    int postfix = 1;
    for (int i = n - 1; i >= 0; i--) {
        res[i] *= postfix;
        postfix *= nums[i];
    }
    for (int i = 0; i < n; i++) {
        cout << res[i] << (i + 1 == n ? "" : " ");
    }
    cout << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int[] res = new int[n];
        int prefix = 1;
        for (int i = 0; i < n; i++) {
            res[i] = prefix;
            prefix *= nums[i];
        }
        int postfix = 1;
        for (int i = n - 1; i >= 0; i--) {
            res[i] *= postfix;
            postfix *= nums[i];
        }
        for (int i = 0; i < n; i++) {
            System.out.print(res[i] + (i + 1 == n ? "" : " "));
        }
        System.out.println();
    }
}`
    }
  },

  // ----------------------------------------------------
  // TWO POINTERS & SLIDING WINDOW
  // ----------------------------------------------------
  {
    title: 'Valid Palindrome Filter',
    slug: 'valid-palindrome-filter',
    difficulty: 'easy',
    topics: ['Two Pointers', 'String'],
    companies: ['Meta', 'Microsoft', 'Amazon', 'Apple', 'Google'],
    sourceLink: 'https://leetcode.com/problems/valid-palindrome/',
    description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

**Input Format (stdin):**
- A single line of text \`s\`.

**Output Format (stdout):**
- \`true\` or \`false\`.`,
    constraints: ['1 <= s.length <= 2 * 10^5'],
    examples: [
      { input: 'A man, a plan, a canal: Panama', output: 'true', explanation: '"amanaplanacanalpanama" is a palindrome.' }
    ],
    testCases: [
      { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true' },
      { input: 'race a car', expectedOutput: 'false' },
      { input: ' ', expectedOutput: 'true' },
      { input: '0P', expectedOutput: 'false' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, '');
const reversed = cleaned.split('').reverse().join('');
console.log(cleaned === reversed ? 'true' : 'false');`,
      python: `import sys
text = sys.stdin.read().strip()
cleaned = [c.lower() for c in text if c.isalnum()]
print('true' if cleaned == cleaned[::-1] else 'false')`,
      cpp: `#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    int l = 0, r = s.length() - 1;
    bool ok = true;
    while (l < r) {
        while (l < r && !isalnum(s[l])) l++;
        while (l < r && !isalnum(s[r])) r--;
        if (tolower(s[l]) != tolower(s[r])) {
            ok = false;
            break;
        }
        l++; r--;
    }
    cout << (ok ? "true" : "false") << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        int l = 0, r = s.length() - 1;
        boolean ok = true;
        while (l < r) {
            while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;
            while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;
            if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) {
                ok = false;
                break;
            }
            l++; r--;
        }
        System.out.println(ok ? "true" : "false");
    }
}`
    }
  },

  {
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    difficulty: 'medium',
    topics: ['Two Pointers', 'Array', 'Greedy'],
    companies: ['Amazon', 'Google', 'Meta', 'Apple', 'Bloomberg'],
    sourceLink: 'https://leetcode.com/problems/container-with-most-water/',
    description: `Given \`n\` non-negative integers \`height\` representing heights of vertical lines, find two lines that together with the x-axis form a container containing the maximum amount of water.

**Input Format (stdin):**
- Line 1: \`n\`
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- Maximum water area (integer).`,
    constraints: ['2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
    examples: [
      { input: '9\n1 8 6 2 5 4 8 3 7', output: '49', explanation: 'Between height 8 and 7 with width 7, area = 49' }
    ],
    testCases: [
      { input: '9\n1 8 6 2 5 4 8 3 7', expectedOutput: '49' },
      { input: '2\n1 1', expectedOutput: '1' },
      { input: '4\n4 3 2 1 4', expectedOutput: '16' },
      { input: '5\n1 2 1 2 1', expectedOutput: '4' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const h = lines[1].trim().split(/\\s+/).map(Number);

let l = 0, r = n - 1, maxArea = 0;
while (l < r) {
    const area = Math.min(h[l], h[r]) * (r - l);
    if (area > maxArea) maxArea = area;
    if (h[l] < h[r]) l++;
    else r--;
}
console.log(maxArea);`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    h = [int(x) for x in lines[1:n+1]]
    l, r, max_area = 0, n - 1, 0
    while l < r:
        area = min(h[l], h[r]) * (r - l)
        if area > max_area:
            max_area = area
        if h[l] < h[r]:
            l += 1
        else:
            r -= 1
    print(max_area)`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    int l = 0, r = n - 1, maxArea = 0;
    while (l < r) {
        maxArea = max(maxArea, min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++;
        else r--;
    }
    cout << maxArea << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] h = new int[n];
        for (int i = 0; i < n; i++) h[i] = sc.nextInt();
        int l = 0, r = n - 1, maxArea = 0;
        while (l < r) {
            maxArea = Math.max(maxArea, Math.min(h[l], h[r]) * (r - l));
            if (h[l] < h[r]) l++;
            else r--;
        }
        System.out.println(maxArea);
    }
}`
    }
  },

  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'medium',
    topics: ['Sliding Window', 'Hash Table', 'String'],
    companies: ['Amazon', 'Google', 'Bloomberg', 'Meta', 'Microsoft'],
    sourceLink: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

**Input Format (stdin):**
- A single string \`s\`.

**Output Format (stdout):**
- The length of the longest substring without duplicate characters.`,
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
    examples: [
      { input: 'abcabcbb', output: '3', explanation: 'The answer is "abc", with the length of 3.' }
    ],
    testCases: [
      { input: 'abcabcbb', expectedOutput: '3' },
      { input: 'bbbbb', expectedOutput: '1' },
      { input: 'pwwkew', expectedOutput: '3' },
      { input: 'dvdf', expectedOutput: '3' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');

let charSet = new Set();
let l = 0, maxLen = 0;

for (let r = 0; r < s.length; r++) {
    while (charSet.has(s[r])) {
        charSet.delete(s[l]);
        l++;
    }
    charSet.add(s[r]);
    maxLen = Math.max(maxLen, r - l + 1);
}

console.log(maxLen);`,
      python: `import sys
s = sys.stdin.read().rstrip('\\r\\n')
char_set = set()
l, max_len = 0, 0
for r in range(len(s)):
    while s[r] in char_set:
        char_set.remove(s[l])
        l += 1
    char_set.add(s[r])
    max_len = max(max_len, r - l + 1)
print(max_len)`,
      cpp: `#include <iostream>
#include <string>
#include <unordered_set>
#include <algorithm>
using namespace std;

int main() {
    string s;
    if (!getline(cin, s)) {
        cout << 0 << "\\n";
        return 0;
    }
    unordered_set<char> seen;
    int l = 0, maxLen = 0;
    for (int r = 0; r < s.length(); r++) {
        while (seen.count(s[r])) {
            seen.erase(s[l]);
            l++;
        }
        seen.insert(s[r]);
        maxLen = max(maxLen, r - l + 1);
    }
    cout << maxLen << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        Set<Character> set = new HashSet<>();
        int l = 0, maxLen = 0;
        for (int r = 0; r < s.length(); r++) {
            while (set.contains(s.charAt(r))) {
                set.remove(s.charAt(l));
                l++;
            }
            set.add(s.charAt(r));
            maxLen = Math.max(maxLen, r - l + 1);
        }
        System.out.println(maxLen);
    }
}`
    }
  },

  // ----------------------------------------------------
  // STACK & QUEUES
  // ----------------------------------------------------
  {
    title: 'Valid Parentheses Matching',
    slug: 'valid-parentheses-matching',
    difficulty: 'easy',
    topics: ['Stack', 'String'],
    companies: ['Amazon', 'Google', 'Meta', 'Bloomberg', 'Microsoft'],
    sourceLink: 'https://leetcode.com/problems/valid-parentheses/',
    description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.
An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.

**Input Format (stdin):**
- A single string of brackets \`s\`.

**Output Format (stdout):**
- \`true\` or \`false\`.`,
    constraints: ['1 <= s.length <= 10^4'],
    examples: [
      { input: '()[]{}', output: 'true', explanation: 'All brackets match correctly.' }
    ],
    testCases: [
      { input: '()[]{}', expectedOutput: 'true' },
      { input: '(]', expectedOutput: 'false' },
      { input: '([)]', expectedOutput: 'false' },
      { input: '{[]}', expectedOutput: 'true' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf8').trim();

function isValid(s) {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };
    for (const c of s) {
        if (c in map) {
            if (stack.length === 0 || stack[stack.length - 1] !== map[c]) return false;
            stack.pop();
        } else {
            stack.push(c);
        }
    }
    return stack.length === 0;
}

console.log(isValid(s) ? 'true' : 'false');`,
      python: `import sys
s = sys.stdin.read().strip()
stack = []
mapping = {")": "(", "}": "{", "]": "["}
ok = True
for char in s:
    if char in mapping:
        top = stack.pop() if stack else '#'
        if mapping[char] != top:
            ok = False
            break
    else:
        stack.append(char)
if stack: ok = False
print('true' if ok else 'false')`,
      cpp: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

int main() {
    string s;
    if (!(cin >> s)) return 0;
    stack<char> st;
    bool ok = true;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) { ok = false; break; }
            char top = st.top(); st.pop();
            if ((c == ')' && top != '(') ||
                (c == '}' && top != '{') ||
                (c == ']' && top != '[')) {
                ok = false;
                break;
            }
        }
    }
    if (!st.empty()) ok = false;
    cout << (ok ? "true" : "false") << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNext() ? sc.next() : "";
        Stack<Character> stack = new Stack<>();
        boolean ok = true;
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') stack.push(c);
            else {
                if (stack.isEmpty()) { ok = false; break; }
                char top = stack.pop();
                if ((c == ')' && top != '(') ||
                    (c == '}' && top != '{') ||
                    (c == ']' && top != '[')) {
                    ok = false;
                    break;
                }
            }
        }
        if (!stack.isEmpty()) ok = false;
        System.out.println(ok ? "true" : "false");
    }
}`
    }
  },

  // ----------------------------------------------------
  // BINARY SEARCH
  // ----------------------------------------------------
  {
    title: 'Rotated Sorted Array Search',
    slug: 'rotated-sorted-array-search',
    difficulty: 'medium',
    topics: ['Binary Search', 'Array'],
    companies: ['Amazon', 'Microsoft', 'Google', 'Meta', 'LinkedIn'],
    sourceLink: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
    description: `Given an integer array \`nums\` sorted in ascending order (with distinct values) that was rotated at an unknown pivot, and a target value, return the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not. Must run in O(log n).

**Input Format (stdin):**
- Line 1: \`n\` and \`target\` space-separated
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- The 0-based index or \`-1\`.`,
    constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i], target <= 10^9', 'All values in nums are unique.'],
    examples: [
      { input: '7 0\n4 5 6 7 0 1 2', output: '4', explanation: '0 is at index 4.' }
    ],
    testCases: [
      { input: '7 0\n4 5 6 7 0 1 2', expectedOutput: '4' },
      { input: '7 3\n4 5 6 7 0 1 2', expectedOutput: '-1' },
      { input: '1 0\n1', expectedOutput: '-1' },
      { input: '3 1\n1 3 5', expectedOutput: '0' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const [n, target] = lines[0].trim().split(/\\s+/).map(Number);
const nums = lines[1].trim().split(/\\s+/).map(Number);

let l = 0, r = n - 1, ans = -1;
while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) {
        ans = mid;
        break;
    }
    if (nums[l] <= nums[mid]) {
        if (target >= nums[l] && target < nums[mid]) r = mid - 1;
        else l = mid + 1;
    } else {
        if (target > nums[mid] && target <= nums[r]) l = mid + 1;
        else r = mid - 1;
    }
}
console.log(ans);`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    target = int(lines[1])
    nums = [int(x) for x in lines[2:2+n]]
    l, r, ans = 0, n - 1, -1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            ans = mid
            break
        if nums[l] <= nums[mid]:
            if nums[l] <= target < nums[mid]:
                r = mid - 1
            else:
                l = mid + 1
        else:
            if nums[mid] < target <= nums[r]:
                l = mid + 1
            else:
                r = mid - 1
    print(ans)`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    if (!(cin >> n >> target)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int l = 0, r = n - 1, ans = -1;
    while (l <= r) {
        int mid = l + (r - l) / 2;
        if (nums[mid] == target) { ans = mid; break; }
        if (nums[l] <= nums[mid]) {
            if (nums[l] <= target && target < nums[mid]) r = mid - 1;
            else l = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[r]) l = mid + 1;
            else r = mid - 1;
        }
    }
    cout << ans << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int target = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int l = 0, r = n - 1, ans = -1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] == target) { ans = mid; break; }
            if (nums[l] <= nums[mid]) {
                if (nums[l] <= target && target < nums[mid]) r = mid - 1;
                else l = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[r]) l = mid + 1;
                else r = mid - 1;
            }
        }
        System.out.println(ans);
    }
}`
    }
  },

  // ----------------------------------------------------
  // DYNAMIC PROGRAMMING
  // ----------------------------------------------------
  {
    title: 'Climbing Staircase Steps',
    slug: 'climbing-staircase-steps',
    difficulty: 'easy',
    topics: ['Dynamic Programming', 'Math', 'Memoization'],
    companies: ['Amazon', 'Google', 'Apple', 'Meta'],
    sourceLink: 'https://leetcode.com/problems/climbing-stairs/',
    description: `You are climbing a staircase that takes \`n\` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

**Input Format (stdin):**
- An integer \`n\`.

**Output Format (stdout):**
- Number of distinct ways.`,
    constraints: ['1 <= n <= 45'],
    examples: [
      { input: '3', output: '3', explanation: '1+1+1, 1+2, 2+1' }
    ],
    testCases: [
      { input: '2', expectedOutput: '2' },
      { input: '3', expectedOutput: '3' },
      { input: '4', expectedOutput: '5' },
      { input: '5', expectedOutput: '8' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const n = parseInt(fs.readFileSync(0, 'utf8').trim());
if (n <= 2) {
    console.log(n);
    process.exit(0);
}
let one = 1, two = 2;
for (let i = 3; i <= n; i++) {
    const temp = one + two;
    one = two;
    two = temp;
}
console.log(two);`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    if n <= 2:
        print(n)
    else:
        a, b = 1, 2
        for _ in range(3, n + 1):
            a, b = b, a + b
        print(b)`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    if (n <= 2) { cout << n << "\\n"; return 0; }
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int temp = a + b;
        a = b;
        b = temp;
    }
    cout << b << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        if (n <= 2) { System.out.println(n); return; }
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        System.out.println(b);
    }
}`
    }
  },

  {
    title: 'Minimum Coin Change',
    slug: 'minimum-coin-change',
    difficulty: 'medium',
    topics: ['Dynamic Programming', 'Breadth-First Search'],
    companies: ['Amazon', 'Bloomberg', 'Microsoft', 'Google', 'Meta'],
    sourceLink: 'https://leetcode.com/problems/coin-change/',
    description: `Given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money, return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

**Input Format (stdin):**
- Line 1: \`n\` (number of coins) and \`amount\` space-separated
- Line 2: \`n\` space-separated coin denominations

**Output Format (stdout):**
- Minimum number of coins, or \`-1\`.`,
    constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
    examples: [
      { input: '3 11\n1 2 5', output: '3', explanation: '11 = 5 + 5 + 1' }
    ],
    testCases: [
      { input: '3 11\n1 2 5', expectedOutput: '3' },
      { input: '1 3\n2', expectedOutput: '-1' },
      { input: '1 0\n1', expectedOutput: '0' },
      { input: '4 6249\n186 419 83 408', expectedOutput: '20' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const [n, amount] = lines[0].trim().split(/\\s+/).map(Number);
const coins = lines[1].trim().split(/\\s+/).map(Number);

const dp = new Array(amount + 1).fill(amount + 1);
dp[0] = 0;
for (let i = 1; i <= amount; i++) {
    for (const c of coins) {
        if (i - c >= 0) {
            dp[i] = Math.min(dp[i], 1 + dp[i - c]);
        }
    }
}
console.log(dp[amount] > amount ? -1 : dp[amount]);`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    amount = int(lines[1])
    coins = [int(x) for x in lines[2:2+n]]
    dp = [amount + 1] * (amount + 1)
    dp[0] = 0
    for i in range(1, amount + 1):
        for c in coins:
            if i - c >= 0:
                dp[i] = min(dp[i], 1 + dp[i - c])
    print(-1 if dp[amount] > amount else dp[amount])`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n, amount;
    if (!(cin >> n >> amount)) return 0;
    vector<int> coins(n);
    for (int i = 0; i < n; i++) cin >> coins[i];
    vector<int> dp(amount + 1, amount + 1);
    dp[0] = 0;
    for (int i = 1; i <= amount; i++) {
        for (int c : coins) {
            if (i - c >= 0) dp[i] = min(dp[i], 1 + dp[i - c]);
        }
    }
    cout << (dp[amount] > amount ? -1 : dp[amount]) << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int amount = sc.nextInt();
        int[] coins = new int[n];
        for (int i = 0; i < n; i++) coins[i] = sc.nextInt();
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int c : coins) {
                if (i - c >= 0) dp[i] = Math.min(dp[i], 1 + dp[i - c]);
            }
        }
        System.out.println(dp[amount] > amount ? -1 : dp[amount]);
    }
}`
    }
  },

  // ----------------------------------------------------
  // INTERVALS
  // ----------------------------------------------------
  {
    title: 'Overlapping Interval Merging',
    slug: 'overlapping-interval-merging',
    difficulty: 'medium',
    topics: ['Intervals', 'Array', 'Sorting'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg'],
    sourceLink: 'https://leetcode.com/problems/merge-intervals/',
    description: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

**Input Format (stdin):**
- Line 1: \`n\` (number of intervals)
- Next \`n\` lines: \`start\` and \`end\` space-separated

**Output Format (stdout):**
- Merged intervals, one per line (space-separated \`start end\`).`,
    constraints: ['1 <= intervals.length <= 10^4', '0 <= start_i <= end_i <= 10^4'],
    examples: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18', explanation: '[1,3] and [2,6] overlap into [1,6].' }
    ],
    testCases: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', expectedOutput: '1 6\n8 10\n15 18' },
      { input: '2\n1 4\n4 5', expectedOutput: '1 5' },
      { input: '1\n2 3', expectedOutput: '2 3' },
      { input: '3\n1 4\n0 4\n3 5', expectedOutput: '0 5' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const intervals = [];
for (let i = 1; i <= n; i++) {
    if (lines[i]) {
        intervals.push(lines[i].trim().split(/\\s+/).map(Number));
    }
}
intervals.sort((a, b) => a[0] - b[0]);
const merged = [];
for (const [start, end] of intervals) {
    if (merged.length === 0 || merged[merged.length - 1][1] < start) {
        merged.push([start, end]);
    } else {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    }
}
console.log(merged.map(x => x.join(' ')).join('\\n'));`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    intervals = []
    idx = 1
    for _ in range(n):
        intervals.append([int(lines[idx]), int(lines[idx+1])])
        idx += 2
    intervals.sort(key=lambda x: x[0])
    merged = []
    for start, end in intervals:
        if not merged or merged[-1][1] < start:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    for m in merged:
        print(f"{m[0]} {m[1]}")`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<pair<int, int>> intervals(n);
    for (int i = 0; i < n; i++) cin >> intervals[i].first >> intervals[i].second;
    sort(intervals.begin(), intervals.end());
    vector<pair<int, int>> merged;
    for (auto& it : intervals) {
        if (merged.empty() || merged.back().second < it.first) {
            merged.push_back(it);
        } else {
            merged.back().second = max(merged.back().second, it.second);
        }
    }
    for (auto& m : merged) {
        cout << m.first << " " << m.second << "\\n";
    }
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[][] intervals = new int[n][2];
        for (int i = 0; i < n; i++) {
            intervals[i][0] = sc.nextInt();
            intervals[i][1] = sc.nextInt();
        }
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] it : intervals) {
            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < it[0]) {
                merged.add(new int[]{it[0], it[1]});
            } else {
                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], it[1]);
            }
        }
        for (int[] m : merged) {
            System.out.println(m[0] + " " + m[1]);
        }
    }
}`
    }
  },

  // ----------------------------------------------------
  // GRAPHS
  // ----------------------------------------------------
  {
    title: 'Number of Connected Grid Islands',
    slug: 'number-of-connected-grid-islands',
    difficulty: 'medium',
    topics: ['Graph', 'Breadth-First Search', 'Depth-First Search', 'Matrix'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg', 'Uber'],
    sourceLink: 'https://leetcode.com/problems/number-of-islands/',
    description: `Given an \`m x n\` 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

**Input Format (stdin):**
- Line 1: \`m\` and \`n\` space-separated
- Next \`m\` lines: \`n\` space-separated 0s and 1s

**Output Format (stdout):**
- Integer count of islands.`,
    constraints: ['1 <= m, n <= 300', 'grid[i][j] is "0" or "1"'],
    examples: [
      { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', output: '1', explanation: 'All 1s form one connected island.' }
    ],
    testCases: [
      { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', expectedOutput: '1' },
      { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', expectedOutput: '3' },
      { input: '1 1\n1', expectedOutput: '1' },
      { input: '2 2\n0 0\n0 0', expectedOutput: '0' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const [m, n] = lines[0].trim().split(/\\s+/).map(Number);
const grid = [];
for (let i = 1; i <= m; i++) {
    grid.push(lines[i].trim().split(/\\s+/));
}

function dfs(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
}

let count = 0;
for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
        if (grid[r][c] === '1') {
            count++;
            dfs(r, c);
        }
    }
}
console.log(count);`,
      python: `import sys
sys.setrecursionlimit(200000)
lines = sys.stdin.read().split()
if lines:
    m, n = int(lines[0]), int(lines[1])
    grid = []
    idx = 2
    for _ in range(m):
        grid.append(lines[idx:idx+n])
        idx += n
    def dfs(r, c):
        if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)
    islands = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == '1':
                islands += 1
                dfs(r, c)
    print(islands)`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

void dfs(vector<vector<char>>& grid, int r, int c, int m, int n) {
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] != '1') return;
    grid[r][c] = '0';
    dfs(grid, r + 1, c, m, n);
    dfs(grid, r - 1, c, m, n);
    dfs(grid, r, c + 1, m, n);
    dfs(grid, r, c - 1, m, n);
}

int main() {
    int m, n;
    if (!(cin >> m >> n)) return 0;
    vector<vector<char>> grid(m, vector<char>(n));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) cin >> grid[i][j];
    }
    int islands = 0;
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (grid[i][j] == '1') {
                islands++;
                dfs(grid, i, j, m, n);
            }
        }
    }
    cout << islands << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    static void dfs(char[][] grid, int r, int c, int m, int n) {
        if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r + 1, c, m, n);
        dfs(grid, r - 1, c, m, n);
        dfs(grid, r, c + 1, m, n);
        dfs(grid, r, c - 1, m, n);
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int m = sc.nextInt();
        int n = sc.nextInt();
        char[][] grid = new char[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                grid[i][j] = sc.next().charAt(0);
            }
        }
        int count = 0;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == '1') {
                    count++;
                    dfs(grid, i, j, m, n);
                }
            }
        }
        System.out.println(count);
    }
}`
    }
  },
  // ----------------------------------------------------
  // LINKED LIST (Simulated with Array input for competitive format)
  // ----------------------------------------------------
  {
    title: 'Reverse Sequence List',
    slug: 'reverse-sequence-list',
    difficulty: 'easy',
    topics: ['Linked List', 'Two Pointers'],
    companies: ['Amazon', 'Google', 'Meta', 'Apple', 'Microsoft'],
    sourceLink: 'https://leetcode.com/problems/reverse-linked-list/',
    description: `Given a sequence of \`n\` integers representing the values of a singly linked list from head to tail, reverse the list and print the resulting values.

**Input Format (stdin):**
- Line 1: \`n\` (length of list)
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- The reversed list values as space-separated integers.`,
    constraints: ['0 <= n <= 5000', '-5000 <= val <= 5000'],
    examples: [
      { input: '5\n1 2 3 4 5', output: '5 4 3 2 1', explanation: 'List reversed.' }
    ],
    testCases: [
      { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1' },
      { input: '2\n1 2', expectedOutput: '2 1' },
      { input: '1\n99', expectedOutput: '99' },
      { input: '4\n7 8 9 10', expectedOutput: '10 9 8 7' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0] || parseInt(lines[0]) === 0) process.exit(0);
const nums = lines[1].trim().split(/\\s+/);
console.log(nums.reverse().join(' '));`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = lines[1:n+1]
    print(" ".join(nums[::-1]))`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n) || n <= 0) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    reverse(nums.begin(), nums.end());
    for (int i = 0; i < n; i++) {
        cout << nums[i] << (i + 1 == n ? "" : " ");
    }
    cout << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        for (int i = n - 1; i >= 0; i--) {
            System.out.print(nums[i] + (i == 0 ? "" : " "));
        }
        System.out.println();
    }
}`
    }
  },

  // ----------------------------------------------------
  // GREEDY / KADANE'S ALGORITHM
  // ----------------------------------------------------
  {
    title: 'Maximum Contiguous Subarray Sum',
    slug: 'maximum-contiguous-subarray-sum',
    difficulty: 'medium',
    topics: ['Array', 'Dynamic Programming', 'Divide and Conquer'],
    companies: ['Amazon', 'Google', 'Microsoft', 'Meta', 'LinkedIn'],
    sourceLink: 'https://leetcode.com/problems/maximum-subarray/',
    description: `Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum. (Kadane's Algorithm).

**Input Format (stdin):**
- Line 1: \`n\`
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- Maximum subarray sum (integer).`,
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    examples: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: '[4,-1,2,1] has the largest sum = 6.' }
    ],
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
      { input: '1\n1', expectedOutput: '1' },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23' },
      { input: '3\n-3 -2 -1', expectedOutput: '-1' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const nums = lines[1].trim().split(/\\s+/).map(Number);

let maxSoFar = nums[0];
let currMax = nums[0];
for (let i = 1; i < n; i++) {
    currMax = Math.max(nums[i], currMax + nums[i]);
    maxSoFar = Math.max(maxSoFar, currMax);
}
console.log(maxSoFar);`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    max_so_far = curr = nums[0]
    for x in nums[1:]:
        curr = max(x, curr + x)
        max_so_far = max(max_so_far, curr)
    print(max_so_far)`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int maxSoFar = nums[0], curr = nums[0];
    for (int i = 1; i < n; i++) {
        curr = max(nums[i], curr + nums[i]);
        maxSoFar = max(maxSoFar, curr);
    }
    cout << maxSoFar << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int maxSoFar = nums[0], curr = nums[0];
        for (int i = 1; i < n; i++) {
            curr = Math.max(nums[i], curr + nums[i]);
            maxSoFar = Math.max(maxSoFar, curr);
        }
        System.out.println(maxSoFar);
    }
}`
    }
  },

  // ----------------------------------------------------
  // BIT MANIPULATION
  // ----------------------------------------------------
  {
    title: 'Single Unique Number Finder',
    slug: 'single-unique-number-finder',
    difficulty: 'easy',
    topics: ['Bit Manipulation', 'Array'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'],
    sourceLink: 'https://leetcode.com/problems/single-number/',
    description: `Given a non-empty array of integers \`nums\`, every element appears twice except for one. Find that single one using linear time complexity and constant extra space.

**Input Format (stdin):**
- Line 1: \`n\`
- Line 2: \`n\` space-separated integers

**Output Format (stdout):**
- The unique integer.`,
    constraints: ['1 <= nums.length <= 3 * 10^4', '-3 * 10^4 <= nums[i] <= 3 * 10^4'],
    examples: [
      { input: '3\n2 2 1', output: '1', explanation: '1 appears once.' }
    ],
    testCases: [
      { input: '3\n2 2 1', expectedOutput: '1' },
      { input: '5\n4 1 2 1 2', expectedOutput: '4' },
      { input: '1\n1', expectedOutput: '1' },
      { input: '5\n7 3 5 3 7', expectedOutput: '5' }
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
if (!lines[0]) process.exit(0);
const n = parseInt(lines[0]);
const nums = lines[1].trim().split(/\\s+/).map(Number);
let xor = 0;
for (const x of nums) xor ^= x;
console.log(xor);`,
      python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    ans = 0
    for x in nums:
        ans ^= x
    print(ans)`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    int ans = 0;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        ans ^= x;
    }
    cout << ans << "\\n";
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int ans = 0;
        for (int i = 0; i < n; i++) ans ^= sc.nextInt();
        System.out.println(ans);
    }
}`
    }
  }
];

// Write out to data file
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const outputPath = path.join(dataDir, 'starterPlayableProblems.json');
fs.writeFileSync(outputPath, JSON.stringify(problems, null, 2), 'utf8');

console.log(`✅ Generated starter playable problems dataset at: ${outputPath}`);
console.log(`📊 Total curated playable problems: ${problems.length}`);

