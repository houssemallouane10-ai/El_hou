// Ready-made examples shown in the Examples sheet
export const examples = [
  {
    lang: 'python', name: 'greet.py',
    title: { ar: 'Python: برنامج يسألك عن اسمك', fr: 'Python : programme interactif', en: 'Python: interactive program' },
    code: `name = input("What's your name? ")
age = int(input("How old are you? "))

print(f"Hello, {name}!")
print(f"In 10 years you will be {age + 10}.")
`,
  },
  {
    lang: 'python', name: 'turtle_star.py',
    title: { ar: 'Python: رسم بالسلحفاة (turtle)', fr: 'Python : dessin avec turtle', en: 'Python: turtle drawing' },
    code: `import turtle

t = turtle.Turtle()
turtle.bgcolor("#10141c")
colors = ["#3ddc84", "#7aa2ff", "#ffab70", "#c49bff", "#ff8f8f"]

for i in range(60):
    t.pencolor(colors[i % len(colors)])
    t.pensize(2)
    t.forward(i * 4)
    t.left(144)

turtle.done()
`,
  },
  {
    lang: 'python', name: 'plot.py',
    title: { ar: 'Python: رسم بياني بـ matplotlib', fr: 'Python : graphique matplotlib', en: 'Python: matplotlib chart' },
    code: `import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)
plt.plot(x, np.sin(x), label="sin(x)")
plt.plot(x, np.cos(x), label="cos(x)")
plt.title("Waves")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
`,
  },
  {
    lang: 'python', name: 'grades.py',
    title: { ar: 'Python: معدل النقاط بـ pandas', fr: 'Python : moyennes avec pandas', en: 'Python: grades with pandas' },
    code: `import pandas as pd

df = pd.DataFrame({
    "student": ["Amine", "Sara", "Yacine", "Lina"],
    "math": [15, 18, 11, 17],
    "physics": [13, 16, 12, 19],
})
df["average"] = df[["math", "physics"]].mean(axis=1)
print(df.sort_values("average", ascending=False).to_string(index=False))
`,
  },
  {
    lang: 'javascript', name: 'table.js',
    title: { ar: 'JavaScript: جدول وكائنات', fr: 'JavaScript : tableau et objets', en: 'JavaScript: objects and tables' },
    code: `const products = [
  { name: "Phone", price: 35000, stock: 4 },
  { name: "Laptop", price: 120000, stock: 2 },
  { name: "Headphones", price: 6500, stock: 12 },
];

console.table(products);
const total = products.reduce((sum, p) => sum + p.price * p.stock, 0);
console.log("Stock value:", total.toLocaleString(), "DA");

const name = prompt("Search a product:");
console.log(products.find((p) => p.name.toLowerCase() === name?.toLowerCase()) ?? "Not found");
`,
  },
  {
    lang: 'javascript', name: 'async.js',
    title: { ar: 'JavaScript: async و await', fr: 'JavaScript : async / await', en: 'JavaScript: async / await' },
    code: `const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 3; i > 0; i--) {
  console.log(i + "...");
  await wait(500);
}
console.log("Go! 🚀");
`,
  },
  {
    lang: 'sql', name: 'shop.sql',
    title: { ar: 'SQL: جداول وربط (JOIN)', fr: 'SQL : tables et JOIN', en: 'SQL: tables and JOIN' },
    code: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total REAL, day TEXT);

INSERT INTO customers VALUES (1, 'Amine', 'Oran'), (2, 'Sara', 'Alger'), (3, 'Karim', 'Annaba');
INSERT INTO orders VALUES
  (1, 1, 2500, '2026-10-01'), (2, 2, 7800, '2026-10-02'),
  (3, 1, 1200, '2026-10-03'), (4, 3, 4300, '2026-10-03');

SELECT c.name, COUNT(o.id) AS orders, SUM(o.total) AS spent
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id ORDER BY spent DESC;
`,
  },
  {
    lang: 'html', name: 'clock.html',
    title: { ar: 'HTML: ساعة متحركة', fr: 'HTML : horloge animée', en: 'HTML: animated clock' },
    code: `<!doctype html>
<html>
<head>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 30% 20%, #1b2a3a, #0b0f15); color: #e8ebf1; font-family: system-ui; }
  .clock { font: 700 18vw/1 ui-monospace, monospace; letter-spacing: -.04em; }
  .clock span { color: #3ddc84; animation: blink 1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
</style>
</head>
<body>
  <div class="clock" id="c"></div>
  <script>
    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      c.innerHTML = p(d.getHours()) + "<span>:</span>" + p(d.getMinutes()) + "<span>:</span>" + p(d.getSeconds());
    };
    tick();
    setInterval(tick, 1000);
  </script>
</body>
</html>
`,
  },
  {
    lang: 'c', name: 'sum.c',
    title: { ar: 'C: مجموع أرقام من المدخلات', fr: 'C : somme lue au clavier', en: 'C: sum numbers from input' },
    code: `#include <stdio.h>

int main(void) {
    int n, x, sum = 0;
    printf("How many numbers? ");
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &x);
        sum += x;
    }
    printf("\\nSum = %d\\n", sum);
    return 0;
}
`,
    stdin: '4\n10 20 30 40\n',
  },
  {
    lang: 'cpp', name: 'grades.cpp',
    title: { ar: 'C++: ترتيب ومتوسط', fr: 'C++ : tri et moyenne', en: 'C++: sort and average' },
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<double> grades = {12.5, 17, 9.75, 15, 18.5};
    sort(grades.rbegin(), grades.rend());
    double avg = accumulate(grades.begin(), grades.end(), 0.0) / grades.size();
    for (double g : grades) cout << g << ' ';
    cout << "\\naverage = " << fixed << setprecision(2) << avg << endl;
}
`,
  },
  {
    lang: 'java', name: 'Main.java',
    title: { ar: 'Java: قراءة بـ Scanner', fr: 'Java : lecture avec Scanner', en: 'Java: reading with Scanner' },
    code: `import java.util.Scanner;

class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.print("Your name: ");
        String name = in.nextLine();
        System.out.print("A number: ");
        int n = in.nextInt();
        System.out.println("Hello " + name + ", " + n + " squared is " + (n * n));
    }
}
`,
    stdin: 'Sara\n12\n',
  },
  {
    lang: 'lua', name: 'game.lua',
    title: { ar: 'Lua: لعبة تخمين الرقم', fr: 'Lua : devine le nombre', en: 'Lua: guess the number' },
    code: `math.randomseed(os.time())
local secret = math.random(1, 20)
print("I picked a number between 1 and 20.")

for tries = 1, 5 do
  io.write("Your guess: ")
  local g = io.read("n")
  if g == nil then break end
  if g == secret then print("Correct in " .. tries .. " tries!") return end
  print(g < secret and "Higher!" or "Lower!")
end
print("The number was " .. secret)
`,
  },
];
