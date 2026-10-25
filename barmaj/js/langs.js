// The language catalog.
//   local   engine that runs on the phone (workers/*.worker.js or the page itself)
//   auto    prefer the cloud while online and the phone offline (slow local compilers)
//   ce      Compiler Explorer language id (godbolt.org), runs in the cloud for free
//   piston  language name on a Piston server, judge0: name prefix on a Judge0 server
//   hl      syntax highlighting grammar (vendor/cm grammars)
//   reads   pattern that means the program reads stdin
//   flags   default compiler flags sent to Compiler Explorer
export const langs = [
  {
    id: 'python', name: 'Python', badge: 'Py', color: '#3572A5', ext: 'py', hl: 'python', popular: 1,
    local: 'python', ce: 'python', piston: 'python', judge0: 'Python (3',
    reads: /\binput\s*\(|sys\.stdin/,
    tpl: `print("Hello, World!")

numbers = [5, 3, 8, 1]
print("Sorted:", sorted(numbers))
print("Sum:", sum(numbers))
`,
  },
  {
    id: 'javascript', name: 'JavaScript', badge: 'JS', color: '#f1e05a', fg: '#1f1d0a', ext: 'js', hl: 'javascript', popular: 1,
    local: 'js', ce: 'javascript', piston: 'javascript', judge0: 'JavaScript',
    reads: /\bprompt\s*\(|\breadline\s*\(/,
    tpl: `console.log("Hello, World!");

const numbers = [5, 3, 8, 1];
console.log("Sorted:", [...numbers].sort((a, b) => a - b));
console.log({ total: numbers.reduce((a, b) => a + b, 0) });
`,
  },
  {
    id: 'typescript', name: 'TypeScript', badge: 'TS', color: '#3178c6', ext: 'ts', hl: 'typescript', popular: 1,
    local: 'ts', piston: 'typescript', judge0: 'TypeScript',
    reads: /\bprompt\s*\(|\breadline\s*\(/,
    tpl: `type User = { name: string; age: number };

const users: User[] = [
  { name: "Amine", age: 21 },
  { name: "Sara", age: 19 },
];

for (const u of users) {
  console.log(\`\${u.name} is \${u.age} years old\`);
}
`,
  },
  {
    id: 'html', name: 'HTML / CSS / JS', badge: '</>', color: '#e34c26', ext: 'html', hl: 'html', popular: 1,
    local: 'web', kind: 'web',
    tpl: `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; background: #10141c; color: #f2f4f8; }
    button { font-size: 1.2rem; padding: .7em 1.4em; border: 0; border-radius: 999px; background: #3dd68c; color: #06240f; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>Hello, World!</h1>
    <button id="btn">Clicked 0 times</button>
  </main>
  <script>
    let n = 0;
    btn.onclick = () => {
      btn.textContent = \`Clicked \${++n} times\`;
      console.log("click", n);
    };
  </script>
</body>
</html>
`,
  },
  {
    id: 'c', name: 'C', badge: 'C', color: '#555555', ext: 'c', hl: 'cpp', popular: 1,
    local: 'clang', auto: true, ce: 'c', piston: 'c', judge0: 'C (GCC', flags: '-O2 -std=c17 -lm',
    reads: /\b(scanf|getchar|fgets|gets|getline)\s*\(/,
    tpl: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    for (int i = 1; i <= 5; i++)
        printf("%d x %d = %d\\n", i, i, i * i);
    return 0;
}
`,
  },
  {
    id: 'cpp', name: 'C++', badge: 'C++', color: '#f34b7d', ext: 'cpp', hl: 'cpp', popular: 1,
    local: 'clang', auto: true, ce: 'c++', piston: 'c++', judge0: 'C++ (GCC', flags: '-O2 -std=c++20',
    reads: /\b(cin\s*>>|scanf\s*\(|getline\s*\(|getchar\s*\()/,
    tpl: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    vector<int> v = {5, 3, 8, 1};
    sort(v.begin(), v.end());
    for (int x : v) cout << x << ' ';
    cout << endl;
    return 0;
}
`,
  },
  {
    id: 'java', name: 'Java', badge: 'Jv', color: '#b07219', ext: 'java', hl: 'java', popular: 1,
    ce: 'java', piston: 'java', judge0: 'Java (',
    reads: /\bScanner\b|System\.in|BufferedReader/,
    tpl: `import java.util.*;

class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        int[] nums = {5, 3, 8, 1};
        Arrays.sort(nums);
        System.out.println(Arrays.toString(nums));
    }
}
`,
  },
  {
    id: 'csharp', name: 'C#', badge: 'C#', color: '#178600', ext: 'cs', hl: 'csharp', popular: 1,
    ce: 'csharp', piston: 'csharp', judge0: 'C# (',
    reads: /Console\.Read/,
    tpl: `using System;
using System.Linq;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
        int[] nums = { 5, 3, 8, 1 };
        Console.WriteLine(string.Join(", ", nums.OrderBy(n => n)));
    }
}
`,
  },
  {
    id: 'sql', name: 'SQL (SQLite)', badge: 'SQL', color: '#e38c00', ext: 'sql', hl: 'sql', popular: 1,
    local: 'sql', kind: 'sql', piston: 'sqlite3', judge0: 'SQL',
    tpl: `CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, city TEXT, grade REAL);

INSERT INTO students (name, city, grade) VALUES
  ('Amine', 'Oran', 15.5),
  ('Sara', 'Alger', 17),
  ('Yacine', 'Oran', 12.25),
  ('Lina', 'Constantine', 18.5);

SELECT name, city, grade FROM students ORDER BY grade DESC;

SELECT city, COUNT(*) AS students, ROUND(AVG(grade), 2) AS average
FROM students GROUP BY city;
`,
  },
  {
    id: 'php', name: 'PHP', badge: 'PHP', color: '#4F5D95', ext: 'php', hl: 'php', popular: 1,
    piston: 'php', judge0: 'PHP',
    reads: /fgets\s*\(\s*STDIN|readline\s*\(|fscanf\s*\(\s*STDIN|stream_get_contents/,
    tpl: `<?php
echo "Hello, World!\\n";

$nums = [5, 3, 8, 1];
sort($nums);
echo implode(", ", $nums), "\\n";
`,
  },
  {
    id: 'kotlin', name: 'Kotlin', badge: 'Kt', color: '#A97BFF', ext: 'kt', hl: 'kotlin', popular: 1,
    ce: 'kotlin', piston: 'kotlin', judge0: 'Kotlin',
    reads: /readLine\s*\(|readln|Scanner/,
    tpl: `fun main() {
    println("Hello, World!")
    val nums = listOf(5, 3, 8, 1)
    println("Sorted: \${nums.sorted()}")
}
`,
  },
  {
    id: 'go', name: 'Go', badge: 'Go', color: '#00ADD8', ext: 'go', hl: 'go', popular: 1,
    ce: 'go', piston: 'go', judge0: 'Go (',
    reads: /fmt\.Scan|bufio\.NewReader\(os\.Stdin|bufio\.NewScanner\(os\.Stdin/,
    tpl: `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
	for i := 1; i <= 3; i++ {
		fmt.Printf("%d squared = %d\\n", i, i*i)
	}
}
`,
  },
  {
    id: 'rust', name: 'Rust', badge: 'Rs', color: '#dea584', fg: '#2a1408', ext: 'rs', hl: 'rust', popular: 1,
    ce: 'rust', piston: 'rust', judge0: 'Rust', flags: '-O --edition 2021',
    reads: /stdin\s*\(/,
    tpl: `fn main() {
    println!("Hello, World!");
    let nums = vec![5, 3, 8, 1];
    let total: i32 = nums.iter().sum();
    println!("Sum = {}", total);
}
`,
  },
  {
    id: 'dart', name: 'Dart', badge: 'Dt', color: '#00B4AB', ext: 'dart', hl: 'dart', popular: 1,
    ce: 'dart', piston: 'dart', judge0: 'Dart',
    reads: /stdin\.read/,
    tpl: `void main() {
  print('Hello, World!');
  var nums = [5, 3, 8, 1]..sort();
  print(nums);
}
`,
  },
  {
    id: 'swift', name: 'Swift', badge: 'Sw', color: '#F05138', ext: 'swift', hl: 'swift', popular: 1,
    ce: 'swift', piston: 'swift', judge0: 'Swift',
    reads: /readLine\s*\(/,
    tpl: `print("Hello, World!")

let nums = [5, 3, 8, 1]
print("Sorted:", nums.sorted())
`,
  },
  {
    id: 'ruby', name: 'Ruby', badge: 'Rb', color: '#701516', ext: 'rb', hl: 'ruby', popular: 1,
    ce: 'ruby', piston: 'ruby', judge0: 'Ruby',
    reads: /\bgets\b|STDIN|\$stdin/,
    tpl: `puts "Hello, World!"

nums = [5, 3, 8, 1]
puts "Sorted: #{nums.sort}"
`,
  },
  {
    id: 'lua', name: 'Lua', badge: 'Lua', color: '#000080', ext: 'lua', hl: 'lua',
    local: 'lua', ce: 'lua', piston: 'lua', judge0: 'Lua',
    reads: /io\.read|io\.stdin/,
    tpl: `print("Hello, World!")

local fruits = { "apple", "banana", "orange" }
for i, fruit in ipairs(fruits) do
  print(i, fruit)
end
`,
  },
  {
    id: 'markdown', name: 'Markdown', badge: 'MD', color: '#083fa1', ext: 'md', hl: 'markdown',
    local: 'markdown', kind: 'doc',
    tpl: `# Hello, World!

Write **Markdown** and see it rendered.

- Lists
- [Links](https://example.com)
- \`inline code\`

| Language | Runs |
| --- | --- |
| Python | on the phone |
| C++ | in the cloud |
`,
  },
  {
    id: 'r', name: 'R', badge: 'R', color: '#198CE7', ext: 'r', hl: 'r',
    piston: 'r', judge0: 'R (',
    reads: /readline\s*\(|readLines\s*\(/,
    tpl: `x <- c(5, 3, 8, 1)
print(sort(x))
cat("Mean:", mean(x), "\\n")
`,
  },
  {
    id: 'bash', name: 'Bash', badge: 'sh', color: '#89e051', fg: '#14240a', ext: 'sh', hl: 'shell',
    piston: 'bash', judge0: 'Bash',
    reads: /\bread\b/,
    tpl: `#!/bin/bash
echo "Hello, World!"
for i in 1 2 3; do
  echo "Line $i"
done
`,
  },
  {
    id: 'scala', name: 'Scala', badge: 'Sc', color: '#c22d40', ext: 'scala', hl: 'scala',
    ce: 'scala', piston: 'scala', judge0: 'Scala',
    reads: /StdIn|readLine/,
    tpl: `object Main {
  def main(args: Array[String]): Unit = {
    println("Hello, World!")
    println(List(5, 3, 8, 1).sorted)
  }
}
`,
  },
  {
    id: 'haskell', name: 'Haskell', badge: 'Hs', color: '#5e5086', ext: 'hs', hl: 'haskell',
    ce: 'haskell', piston: 'haskell', judge0: 'Haskell',
    reads: /getLine|getContents|interact/,
    tpl: `main :: IO ()
main = do
  putStrLn "Hello, World!"
  print (sum [1 .. 10])
`,
  },
  {
    id: 'zig', name: 'Zig', badge: 'Zig', color: '#ec915c', fg: '#2b1505', ext: 'zig', hl: 'rust',
    ce: 'zig', piston: 'zig',
    tpl: `const std = @import("std");

pub fn main() void {
    std.debug.print("Hello, World!\\n", .{});
}
`,
  },
  {
    id: 'perl', name: 'Perl', badge: 'Pl', color: '#0298c3', ext: 'pl', hl: 'perl',
    ce: 'perl', piston: 'perl', judge0: 'Perl',
    reads: /<STDIN>|<>/,
    tpl: `use strict;
use warnings;

print "Hello, World!\\n";
my @nums = sort { $a <=> $b } (5, 3, 8, 1);
print "@nums\\n";
`,
  },
  {
    id: 'elixir', name: 'Elixir', badge: 'Ex', color: '#6e4a7e', ext: 'ex', hl: 'ruby',
    ce: 'elixir', piston: 'elixir', judge0: 'Elixir',
    reads: /IO\.gets|IO\.read/,
    tpl: `IO.puts "Hello, World!"
Enum.each(1..3, fn i -> IO.puts "#{i} squared = #{i * i}" end)
`,
  },
  {
    id: 'julia', name: 'Julia', badge: 'Jl', color: '#a270ba', ext: 'jl', hl: 'julia',
    ce: 'julia', piston: 'julia',
    reads: /readline\s*\(/,
    tpl: `println("Hello, World!")
for i in 1:3
    println("$i squared = $(i^2)")
end
`,
  },
  {
    id: 'pascal', name: 'Pascal', badge: 'Pas', color: '#E3F171', fg: '#232608', ext: 'pas', hl: 'pascal',
    ce: 'pascal', piston: 'pascal', judge0: 'Pascal',
    reads: /\breadln?\b/i,
    tpl: `program Hello;
var
  i: integer;
begin
  writeln('Hello, World!');
  for i := 1 to 3 do
    writeln(i, ' squared = ', i * i);
end.
`,
  },
  {
    id: 'fortran', name: 'Fortran', badge: 'F90', color: '#4d41b1', ext: 'f90', hl: 'fortran',
    ce: 'fortran', piston: 'fortran', judge0: 'Fortran',
    reads: /\bread\s*[(*]/i,
    tpl: `program hello
  implicit none
  integer :: i
  print *, "Hello, World!"
  do i = 1, 3
    print *, i, i * i
  end do
end program hello
`,
  },
  {
    id: 'd', name: 'D', badge: 'D', color: '#ba595e', ext: 'd', hl: 'd',
    ce: 'd', piston: 'd', judge0: 'D (',
    reads: /readln|readf/,
    tpl: `import std.stdio;

void main() {
    writeln("Hello, World!");
}
`,
  },
  {
    id: 'nim', name: 'Nim', badge: 'Nim', color: '#ffc200', fg: '#2a2000', ext: 'nim', hl: 'python',
    ce: 'nim', piston: 'nim',
    reads: /readLine\s*\(\s*stdin/,
    tpl: `echo "Hello, World!"
for i in 1..3:
  echo i, " squared = ", i * i
`,
  },
  {
    id: 'crystal', name: 'Crystal', badge: 'Cr', color: '#000100', ext: 'cr', hl: 'crystal',
    ce: 'crystal', piston: 'crystal',
    reads: /\bgets\b/,
    tpl: `puts "Hello, World!"
(1..3).each { |i| puts "#{i} squared = #{i * i}" }
`,
  },
  {
    id: 'ocaml', name: 'OCaml', badge: 'ML', color: '#ef7a08', ext: 'ml', hl: 'ocaml',
    ce: 'ocaml', piston: 'ocaml', judge0: 'OCaml',
    reads: /read_line|Scanf/,
    tpl: `let () =
  print_endline "Hello, World!";
  List.iter (fun x -> Printf.printf "%d\\n" (x * x)) [1; 2; 3]
`,
  },
  {
    id: 'fsharp', name: 'F#', badge: 'F#', color: '#b845fc', ext: 'fs', hl: 'fsharp',
    ce: 'fsharp', piston: 'fsharp.net', judge0: 'F#',
    reads: /ReadLine/,
    tpl: `printfn "Hello, World!"
for i in 1..3 do
    printfn "%d squared = %d" i (i * i)
`,
  },
  {
    id: 'vb', name: 'Visual Basic', badge: 'VB', color: '#945db7', ext: 'vb', hl: 'vb',
    ce: 'vb', piston: 'basic.net', judge0: 'Visual Basic',
    reads: /ReadLine/,
    tpl: `Module Program
    Sub Main()
        Console.WriteLine("Hello, World!")
        For i As Integer = 1 To 3
            Console.WriteLine(i * i)
        Next
    End Sub
End Module
`,
  },
  {
    id: 'objc', name: 'Objective-C', badge: 'ObjC', color: '#438eff', ext: 'm', hl: 'objc',
    ce: 'objc', piston: 'objective-c', judge0: 'Objective-C',
    reads: /\bscanf\s*\(/,
    tpl: `#import <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    id: 'clojure', name: 'Clojure', badge: 'Clj', color: '#db5855', ext: 'clj', hl: 'clojure',
    ce: 'clojure', piston: 'clojure', judge0: 'Clojure',
    reads: /read-line/,
    tpl: `(println "Hello, World!")
(println (sort [5 3 8 1]))
`,
  },
  {
    id: 'racket', name: 'Racket', badge: 'Rkt', color: '#3c5caa', ext: 'rkt', hl: 'scheme',
    ce: 'racket', piston: 'racket',
    reads: /read-line|\(read\)/,
    tpl: `#lang racket
(displayln "Hello, World!")
(displayln (sort '(5 3 8 1) <))
`,
  },
  {
    id: 'erlang', name: 'Erlang', badge: 'Erl', color: '#B83998', ext: 'erl', hl: 'erlang',
    ce: 'erlang', piston: 'erlang', judge0: 'Erlang',
    reads: /io:get_line|io:fread/,
    tpl: `-module(example).
-export([main/0]).

main() ->
    io:format("Hello, World!~n").
`,
  },
  {
    id: 'raku', name: 'Raku', badge: 'Raku', color: '#0000fb', ext: 'raku', hl: 'perl',
    ce: 'raku', piston: 'raku',
    reads: /\bget\b|\$\*IN/,
    tpl: `say "Hello, World!";
say [+] 1..10;
`,
  },
  {
    id: 'ada', name: 'Ada', badge: 'Ada', color: '#02f88c', fg: '#03261a', ext: 'adb', hl: 'pascal',
    ce: 'ada',
    reads: /Get_Line|\bGet\s*\(/,
    tpl: `with Ada.Text_IO; use Ada.Text_IO;

procedure Example is
begin
   Put_Line ("Hello, World!");
end Example;
`,
  },
  {
    id: 'cobol', name: 'COBOL', badge: 'CBL', color: '#005ca5', ext: 'cob', hl: 'cobol',
    ce: 'cobol', piston: 'cobol', judge0: 'COBOL',
    reads: /\bACCEPT\b/i,
    tpl: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       PROCEDURE DIVISION.
           DISPLAY "Hello, World!".
           STOP RUN.
`,
  },
  {
    id: 'odin', name: 'Odin', badge: 'Odn', color: '#60AFFE', fg: '#08223b', ext: 'odin', hl: 'go',
    ce: 'odin',
    tpl: `package main

import "core:fmt"

main :: proc() {
	fmt.println("Hello, World!")
}
`,
  },
  {
    id: 'v', name: 'V', badge: 'V', color: '#4f87c4', ext: 'v', hl: 'go',
    ce: 'v', piston: 'vlang',
    tpl: `fn main() {
	println('Hello, World!')
}
`,
  },
  {
    id: 'gleam', name: 'Gleam', badge: 'Glm', color: '#ffaff3', fg: '#3a0a33', ext: 'gleam', hl: 'rust',
    ce: 'gleam',
    tpl: `import gleam/io

pub fn main() {
  io.println("Hello, World!")
}
`,
  },
  {
    id: 'mojo', name: 'Mojo', badge: 'Mojo', color: '#ff4c1f', ext: 'mojo', hl: 'python',
    ce: 'mojo',
    tpl: `def main():
    print("Hello, World!")
`,
  },
  {
    id: 'vala', name: 'Vala', badge: 'Vala', color: '#a56de2', ext: 'vala', hl: 'csharp',
    ce: 'vala',
    reads: /stdin\.read_line/,
    tpl: `void main () {
    print ("Hello, World!\\n");
}
`,
  },
  {
    id: 'asm', name: 'Assembly (x86-64)', badge: 'ASM', color: '#6E4C13', ext: 'asm', hl: 'gas',
    ce: 'assembly', piston: 'nasm64', judge0: 'Assembly',
    tpl: `section .data
    msg db "Hello, World!", 10
    len equ $ - msg

section .text
    global _start
_start:
    mov rax, 1          ; write
    mov rdi, 1          ; stdout
    mov rsi, msg
    mov rdx, len
    syscall
    mov rax, 60         ; exit
    xor rdi, rdi
    syscall
`,
  },
  {
    id: 'prolog', name: 'Prolog', badge: 'Pro', color: '#74283c', ext: 'pl', hl: 'erlang',
    piston: 'prolog', judge0: 'Prolog',
    tpl: `:- initialization(main).

main :- write('Hello, World!'), nl, halt.
`,
  },
  {
    id: 'octave', name: 'Octave / MATLAB', badge: 'M', color: '#0790c0', ext: 'm', hl: 'octave',
    piston: 'octave', judge0: 'Octave',
    reads: /\binput\s*\(/,
    tpl: `disp("Hello, World!")
x = [5 3 8 1];
disp(sort(x))
`,
  },
  {
    id: 'groovy', name: 'Groovy', badge: 'Gr', color: '#4298b8', ext: 'groovy', hl: 'groovy',
    piston: 'groovy', judge0: 'Groovy',
    reads: /System\.in/,
    tpl: `println "Hello, World!"
println([5, 3, 8, 1].sort())
`,
  },
  {
    id: 'lisp', name: 'Common Lisp', badge: 'Lsp', color: '#3fb68b', ext: 'lisp', hl: 'commonlisp',
    piston: 'lisp', judge0: 'Common Lisp',
    reads: /read-line|\(read\)/,
    tpl: `(format t "Hello, World!~%")
(format t "~a~%" (sort (list 5 3 8 1) #'<))
`,
  },
  {
    id: 'powershell', name: 'PowerShell', badge: 'PS', color: '#012456', ext: 'ps1', hl: 'powershell',
    piston: 'powershell',
    reads: /Read-Host/,
    tpl: `Write-Output "Hello, World!"
1..3 | ForEach-Object { "$_ squared = $($_ * $_)" }
`,
  },
  {
    id: 'brainfuck', name: 'Brainfuck', badge: 'BF', color: '#2F2530', ext: 'bf', hl: 'brainfuck',
    piston: 'brainfuck',
    tpl: `++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.
`,
  },
];

export const byId = Object.fromEntries(langs.map((l) => [l.id, l]));

// Extension → language, for files opened from the device
const extMap = {
  py: 'python', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  html: 'html', htm: 'html', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', java: 'java', cs: 'csharp',
  sql: 'sql', php: 'php', kt: 'kotlin', kts: 'kotlin', go: 'go', rs: 'rust', dart: 'dart', swift: 'swift', rb: 'ruby',
  lua: 'lua', md: 'markdown', markdown: 'markdown', r: 'r', sh: 'bash', bash: 'bash', scala: 'scala', hs: 'haskell',
  zig: 'zig', pl: 'perl', ex: 'elixir', exs: 'elixir', jl: 'julia', pas: 'pascal', f90: 'fortran', f: 'fortran', d: 'd',
  nim: 'nim', cr: 'crystal', ml: 'ocaml', fs: 'fsharp', vb: 'vb', m: 'objc', clj: 'clojure', rkt: 'racket', erl: 'erlang',
  raku: 'raku', adb: 'ada', cob: 'cobol', cbl: 'cobol', odin: 'odin', v: 'v', gleam: 'gleam', mojo: 'mojo', vala: 'vala',
  asm: 'asm', s: 'asm', groovy: 'groovy', lisp: 'lisp', ps1: 'powershell', bf: 'brainfuck', css: 'html',
};

export const langForName = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return extMap[ext] || null;
};

// Best guess for pasted or shared text
export const detectLang = (code) => {
  const c = code.slice(0, 4000);
  const tests = [
    ['php', /<\?php/],
    ['html', /<!doctype html|<html[\s>]|<body[\s>]|<div[\s>]/i],
    ['cpp', /#include\s*<(iostream|vector|string|bits\/stdc\+\+\.h|algorithm|map)>|std::|cout\s*<</],
    ['c', /#include\s*<stdio\.h>|printf\s*\(/],
    ['java', /public\s+static\s+void\s+main|System\.out\.print/],
    ['csharp', /Console\.Write|using\s+System;/],
    ['go', /^package\s+main/m],
    ['rust', /fn\s+main\s*\(\s*\)|println!\(/],
    ['kotlin', /fun\s+main\s*\(/],
    ['swift', /import\s+Foundation|\blet\s+\w+\s*:\s*\[?(Int|String)/],
    ['sql', /^\s*(SELECT|CREATE\s+TABLE|INSERT\s+INTO)\b/im],
    ['typescript', /:\s*(string|number|boolean)\b|interface\s+\w+\s*\{/],
    ['javascript', /console\.log|=>|\b(const|let)\s+\w+\s*=/],
    ['python', /^\s*(def|import|from)\s+\w+|print\s*\(|:\s*$/m],
    ['ruby', /^\s*puts\s|\bend\s*$/m],
    ['lua', /\blocal\s+\w+\s*=|\bfunction\b[\s\S]*\bend\b/],
    ['markdown', /^#{1,6}\s+\S/m],
  ];
  for (const [id, re] of tests) if (re.test(c)) return id;
  return 'python';
};

const remote = (l, s) => {
  if ((s.piston.url && l.piston) || (s.judge0.url && l.judge0)) return 'server';
  if (l.ce && s.ce) return 'cloud';
  return null;
};

// Languages that can run both on the phone and in the cloud let the user choose
export const hasChoice = (l, s) => !!l.local && !!remote(l, s);

export const enginePref = (l, s) => s.engine?.[l.id] || (l.auto ? 'auto' : 'local');

// Where a language runs right now, given the settings and the connection
export const runsOn = (l, s) => {
  const cloud = remote(l, s);
  if (l.local) {
    const pref = enginePref(l, s);
    if (cloud && (pref === 'cloud' || (pref === 'auto' && navigator.onLine !== false))) return cloud;
    return 'local';
  }
  return cloud || 'needs-server';
};
