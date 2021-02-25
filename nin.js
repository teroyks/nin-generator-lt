const doc = `\nNational Identification Number Generator\n\nUsage:\n  nin [-v] [--year=<yyyy>]\n\nOptions:\n  -h --help        Show this screen\n  -v --verbose     Print more info about the NIN\n  -y --year=<yyyy> Birth year (default: random)\n`;
const processArgv = ()=>typeof Deno !== "undefined" && Deno.args || typeof process !== "undefined" && process.argv.slice(2) || []
;
const uniqueMap = (arr)=>{
    const m = new Map();
    arr.forEach((t)=>m.has(t.toString()) || m.set(t.toString(), t)
    );
    return m;
};
const unique = (arr)=>{
    return Array.from(uniqueMap(arr).values());
};
const eachSlice = (orig, size)=>{
    const arr = [];
    for(let i = 0, l = orig.length; i < l; i += size){
        arr.push(orig.slice(i, i + size));
    }
    return arr;
};
const stringPartition = (source, expr)=>{
    const i = source.indexOf(expr);
    if (i < 0) {
        return [
            source,
            "",
            ""
        ];
    }
    return [
        source.substring(0, i),
        expr,
        source.substring(i + expr.length)
    ];
};
class Pattern {
    toString() {
        return `${this.constructor.name}()`;
    }
    fix() {
        this.fixIdentities();
        this.fixRepeatingArguments();
        return this;
    }
    fixIdentities(uniq) {
        if (!this.children) {
            return this;
        }
        uniq = uniq || uniqueMap(this.flat());
        for(let i in this.children){
            if (this.children.hasOwnProperty(i)) {
                const c = this.children[i];
                if (!c.children) {
                    if (!uniq.has(c.toString())) {
                        throw new Error("Invalid runtime state");
                    }
                    this.children = this.children || [];
                    this.children[i] = uniq.get(c.toString());
                } else {
                    c.fixIdentities(uniq);
                }
            }
        }
        return this;
    }
    fixRepeatingArguments() {
        this.either().children.map((c)=>c.children
        ).forEach((case_)=>{
            case_?.filter((c)=>c instanceof ChildPattern && case_.filter((x)=>c.equalTo(x)
                ).length > 1
            ).forEach((e)=>{
                if (e instanceof Argument || e instanceof Option1 && e.argCount > 0) {
                    if (!e.value) {
                        e.value = [];
                    } else if (typeof e.value === "string") {
                        e.value = e.value.split(/\s+/g);
                    }
                }
                if (e instanceof Command || e instanceof Option1 && e.argCount === 0) {
                    e.value = 0;
                }
            });
        });
        return this;
    }
    either() {
        const ret = [];
        const groups = [
            [
                this
            ]
        ];
        while(groups.length > 0){
            const children = groups.shift();
            const types = children.map((child)=>child.constructor
            );
            if (types.includes(Either)) {
                const i = children.findIndex((child)=>child instanceof Either
                );
                const either = children[i];
                children.splice(i, 1);
                for (let c of either.children){
                    groups.push([
                        c,
                        ...children
                    ]);
                }
            } else if (types.includes(Required)) {
                const i = children.findIndex((child)=>child instanceof Required
                );
                const required = children[i];
                children.splice(i, 1);
                groups.push(required.children.concat(children));
            } else if (types.includes(Optional)) {
                const i = children.findIndex((child)=>child instanceof Optional
                );
                const optional = children[i];
                children.splice(i, 1);
                groups.push(optional.children.concat(children));
            } else if (types.includes(AnyOptions)) {
                const i = children.findIndex((child)=>child instanceof AnyOptions
                );
                const anyOptions = children[i];
                children.splice(i, 1);
                groups.push(anyOptions.children.concat(children));
            } else if (types.includes(OneOrMore)) {
                const i = children.findIndex((child)=>child instanceof OneOrMore
                );
                const oneOrMore = children[i];
                children.splice(i, 1);
                groups.push([
                    ...oneOrMore.children,
                    ...oneOrMore.children,
                    ...children
                ]);
            } else {
                ret.push(children);
            }
        }
        const args = ret.map((e)=>new Required(...e)
        );
        return new Either(...args);
    }
}
class ChildPattern extends Pattern {
    constructor(name, value = null){
        super();
        this.name = name;
        this.value = value;
    }
    equalTo(other) {
        return other === this || other.constructor === this.constructor && this.name === other.name && this.value === other.value;
    }
    toString() {
        return `${this.constructor.name}(${this.name}, ${this.value === null ? "" : this.value})`;
    }
    flat(...types) {
        if (types.length === 0 || types.includes(this.constructor)) {
            return [
                this
            ];
        }
        return [];
    }
    match(left, collected = []) {
        const [pos, match] = this.singleMatch(left);
        if (!match) {
            return [
                false,
                left,
                collected
            ];
        }
        left = [
            ...left.slice(0, pos),
            ...left.slice(pos + 1)
        ];
        const sameName = collected.filter((a)=>a instanceof ChildPattern && a.name === this.name
        );
        if (this.value instanceof Array || typeof this.value === "number") {
            let increment;
            if (typeof this.value === "number") {
                increment = 1;
            } else {
                increment = typeof match.value === "string" ? [
                    match.value
                ] : match.value;
            }
            if (sameName.length === 0) {
                match.value = increment;
                return [
                    true,
                    left,
                    [
                        ...collected,
                        match
                    ]
                ];
            }
            if (increment instanceof Array && sameName[0].value instanceof Array) {
                sameName[0].value.push(...increment);
            } else if (!!increment && typeof sameName[0].value === "number" && typeof increment === "number") {
                sameName[0].value += increment;
            } else {
                throw new Error("Invalid runtime state");
            }
            return [
                true,
                left,
                collected
            ];
        }
        return [
            true,
            left,
            [
                ...collected,
                match
            ]
        ];
    }
}
class Option1 extends ChildPattern {
    constructor(__short, __long, argCount = 0, value1 = false){
        super(__long || __short, value1);
        this.short = __short;
        this.long = __long;
        this.argCount = argCount;
        if (![
            0,
            1
        ].includes(argCount)) {
            throw new Error("Invalid runtime state");
        }
        if (value1 === false && argCount > 0) {
            this.value = null;
        }
    }
    toString() {
        return `Option(${this.short || ""}, ${this.long || ""}, ${this.argCount}, ${this.value !== null ? this.value : ""})`;
    }
    static parse(optionDescription) {
        let __short1 = null;
        let __long1 = null;
        let argCount1 = 0;
        let value2 = false;
        let [options, , description] = stringPartition(optionDescription.trim(), "  ");
        options = options.replace(/,/g, " ").replace(/=/g, " ");
        for (let s of options.trim().split(/\s+/g)){
            if (s.startsWith("--")) {
                __long1 = s;
            } else if (s.startsWith("-")) {
                __short1 = s;
            } else {
                argCount1 = 1;
            }
        }
        if (argCount1 > 0) {
            const matched = description.match(/\[default: (.*)\]/i);
            if (matched && matched.length > 1) {
                value2 = matched[1];
            }
        }
        return new Option1(__short1, __long1, argCount1, value2);
    }
    singleMatch(left) {
        for(let i = 0; i < left.length; i++){
            const p = left[i];
            if (p instanceof ChildPattern && this.name === p.name) {
                return [
                    i,
                    p
                ];
            }
        }
        return [
            -1,
            null
        ];
    }
}
class Argument extends ChildPattern {
    singleMatch(left) {
        for(let i = 0; i < left.length; i++){
            const p = left[i];
            if (p instanceof Argument) {
                return [
                    i,
                    new Argument(this.name, p.value)
                ];
            }
        }
        return [
            -1,
            null
        ];
    }
    static parse(class_, source) {
        const name1 = source.match(/(<\S*?>)/)?.[0];
        const value2 = source.match(/\[default: (.*)\]/i);
        return new class_(name1, value2 ? value2[0] : null);
    }
}
class Command extends Argument {
    constructor(name1, value2 = false){
        super(name1, value2);
        this.name = name1;
    }
    singleMatch(left) {
        for(let i = 0; i < left.length; i++){
            const p = left[i];
            if (p instanceof Argument) {
                if (p.value === this.name) {
                    return [
                        i,
                        new Command(this.name, true)
                    ];
                } else {
                    break;
                }
            }
        }
        return [
            -1,
            null
        ];
    }
}
class ParentPattern extends Pattern {
    children = [];
    constructor(...children){
        super();
        this.children = children;
    }
    flat(...types) {
        if (types.includes(this.constructor)) {
            return [
                this
            ];
        } else {
            return this.children.map((c)=>c.flat(...types)
            ).flat();
        }
    }
    toString() {
        return `${this.constructor.name}(${this.children.map((c)=>c.toString()
        ).join(", ")})`;
    }
}
class Required extends ParentPattern {
    match(left, collected = []) {
        let l = left;
        let [c, matched] = [
            collected,
            false
        ];
        for (const p of this.children){
            [matched, l, c] = p.match(l, c);
            if (!matched) {
                return [
                    false,
                    left,
                    collected
                ];
            }
        }
        return [
            true,
            l,
            c
        ];
    }
}
class Optional extends ParentPattern {
    match(left, collected = []) {
        for (const p of this.children){
            [, left, collected] = p.match(left, collected);
        }
        return [
            true,
            left,
            collected
        ];
    }
}
class AnyOptions extends Optional {
}
class OneOrMore extends ParentPattern {
    match(left, collected = []) {
        if (this.children.length !== 1) {
            throw new Error("Invalid runtime state");
        }
        let [l, c, matched, times] = [
            left,
            collected,
            true,
            0
        ];
        let l_ = null;
        while(matched){
            [matched, l, c] = this.children[0].match(l, c);
            times += matched ? 1 : 0;
            if (l_ === l) {
                break;
            }
            l_ = l;
        }
        if (times >= 1) {
            return [
                true,
                l,
                c
            ];
        }
        return [
            false,
            left,
            collected
        ];
    }
}
class Either extends ParentPattern {
    match(left, collected = []) {
        const outcomes = [];
        for (const p of this.children){
            const found = p.match(left, collected);
            if (found[0]) {
                outcomes.push(found);
            }
        }
        const outcomeSize = (outcome)=>outcome[1] === null ? 0 : outcome[1].length
        ;
        if (outcomes.length > 0) {
            return outcomes.sort((a, b)=>outcomeSize(a) - outcomeSize(b)
            )[0];
        }
        return [
            false,
            left,
            collected
        ];
    }
}
const parseArgv = (tokens, options, optionsFirst = false)=>{
    const parsed = [];
    while(tokens.current() !== null){
        if (tokens.current() === "--") {
            return parsed.concat(tokens.next().map((v)=>new Argument(null, v)
            ));
        } else if (tokens.current()?.startsWith("--")) {
            parsed.push(...parseLong(tokens, options));
        } else if (tokens.current()?.startsWith("-") && tokens.current() !== "-") {
            parsed.push(...parseShorts(tokens, options));
        } else if (optionsFirst) {
            return parsed.concat(tokens.map((v)=>new Argument(null, v)
            ));
        } else {
            parsed.push(new Argument(null, tokens.move()));
        }
    }
    return parsed;
};
const parseDefaults = (doc1)=>{
    let split = doc1.split(/^ *(<\S+?>|-\S+?)/mg).slice(1);
    split = eachSlice(split, 2).filter((pair)=>pair.length === 2
    ).map(([s1, s2])=>s1 + s2
    );
    return split.filter((s)=>s.startsWith("-")
    ).map((s)=>Option1.parse(s)
    );
};
class DocoptLanguageError extends Error {
}
class Exit extends Error {
    constructor(_message = ""){
        super();
        this._message = _message;
    }
    get message() {
        return `${this._message}\n${Exit.usage || ""}`.trim();
    }
}
const parseLong = (tokens, options)=>{
    let __long1, eq, value3;
    [__long1, eq, value3] = stringPartition(tokens?.move() || "", "=");
    if (!__long1.startsWith("--")) {
        throw new Error("Invalid runtime state");
    }
    value3 = eq === value3 && eq === "" ? null : value3;
    let similar = options.filter((o)=>o.long && o.long === __long1
    );
    if (tokens.error === Exit && similar.length === 0) {
        similar = options.filter((o)=>o.long && o.long.startsWith(__long1)
        );
    }
    let o;
    if (similar.length > 1) {
        const ostr = similar.map((o1)=>o1.long
        ).join(", ");
        throw new tokens.error(`${__long1} is not a unique prefix: ${ostr}`);
    } else if (similar.length === 0) {
        const argCount1 = eq === "=" ? 1 : 0;
        o = new Option1(null, __long1, argCount1);
        options.push(o);
        if (tokens.error === Exit) {
            o = new Option1(null, __long1, argCount1, argCount1 === 1 ? value3 : true);
        }
    } else {
        const s0 = similar[0];
        o = new Option1(s0.short, s0.long, s0.argCount, s0.value);
        if (o.argCount === 0) {
            if (value3 !== null) {
                throw new tokens.error(`${o.long} must not have an argument`);
            }
        } else {
            if (value3 === null) {
                if (tokens.current() === null) {
                    throw new tokens.error(`${o.long} requires argument`);
                }
                value3 = tokens.move();
            }
        }
        if (tokens.error === Exit) {
            o.value = value3 !== null ? value3 : true;
        }
    }
    return [
        o
    ];
};
const parseShorts = (tokens, options)=>{
    const token = tokens.move();
    if (!token || !token.startsWith("-") || token.startsWith("--")) {
        throw new Error("Invalid runtime state");
    }
    let left = token?.substring(1);
    const parsed = [];
    while(left && left !== ""){
        let o;
        let __short1;
        [__short1, left] = [
            "-" + left[0],
            left.substring(1)
        ];
        const similar = options.filter((o1)=>o1.short === __short1
        );
        if (similar.length > 1) {
            throw new tokens.error(`${__short1} is specified ambiguously ${similar.length} times`);
        } else if (similar.length === 0) {
            o = new Option1(__short1, null, 0);
            options.push(o);
            if (tokens.error === Exit) {
                o = new Option1(__short1, null, 0, true);
            }
        } else {
            const s0 = similar[0];
            o = new Option1(__short1, s0.long, s0.argCount, s0.value);
            let value3 = null;
            if (o.argCount !== 0) {
                if (left === "") {
                    if (tokens.current() === null) {
                        throw new tokens.error(`${__short1} requires argument`);
                    }
                    value3 = tokens.move();
                } else {
                    value3 = left;
                    left = "";
                }
            }
            if (tokens.error === Exit) {
                o.value = value3 !== null ? value3 : true;
            }
        }
        parsed.push(o);
    }
    return parsed;
};
class TokenStream extends Array {
    constructor(source = [], error = Exit){
        super();
        this.error = error;
        if (typeof source === "string") {
            source = source.trim().split(/\s+/g);
        }
        if (typeof source === "number") {
            source = new Array(source);
        }
        this.push(...source);
    }
    move() {
        return this.shift() || null;
    }
    next() {
        this.shift();
        return this;
    }
    current() {
        return this.length > 0 ? this[0] : null;
    }
}
const parsePattern = (source1, options)=>{
    const tokens = new TokenStream(source1.replace(/([\[\]\(\)\|]|\.\.\.)/g, " $1 "), DocoptLanguageError);
    const result = parseExpr(tokens, options);
    if (tokens.current() != null) {
        throw new tokens.error(`unexpected ending: ${tokens.join(" ")}`);
    }
    return new Required(...result);
};
const parseExpr = (tokens, options)=>{
    let seq = parseSeq(tokens, options);
    if (tokens.current() !== "|") {
        return seq;
    }
    let result = seq.length > 1 ? [
        new Required(...seq)
    ] : seq;
    while(tokens.current() === "|"){
        tokens.move();
        seq = parseSeq(tokens, options);
        result = result.concat(seq.length > 1 ? [
            new Required(...seq)
        ] : seq);
    }
    return result.length > 1 ? [
        new Either(...result)
    ] : result;
};
const parseSeq = (tokens, options)=>{
    const result = [];
    const stop = [
        undefined,
        null,
        "]",
        ")",
        "|"
    ];
    while(!stop.includes(tokens.current())){
        let atom = parseAtom(tokens, options);
        if (tokens.current() === "...") {
            atom = [
                new OneOrMore(...atom)
            ];
            tokens.move();
        }
        result.push(...atom);
    }
    return result;
};
const parseAtom = (tokens, options)=>{
    const token = tokens.current();
    let matching;
    let pattern;
    if ([
        "(",
        "["
    ].includes(token)) {
        tokens.move();
        if (token === "(") {
            matching = ")";
            pattern = Required;
        } else {
            matching = "]";
            pattern = Optional;
        }
        let result = new pattern(...parseExpr(tokens, options));
        if (tokens.move() !== matching) {
            throw new tokens.error(`unmatched '${token}'`);
        }
        return [
            result
        ];
    } else if (token === "options") {
        tokens.move();
        return [
            new AnyOptions()
        ];
    } else if (token?.startsWith("--") && token !== "--") {
        return parseLong(tokens, options);
    } else if (token?.startsWith("-") && ![
        "-",
        "--"
    ].includes(token)) {
        return parseShorts(tokens, options);
    } else if (token?.startsWith("<") && token.endsWith(">") || token?.toUpperCase() === token && token.match(/[A-Z]/)) {
        return [
            new Argument(tokens.move())
        ];
    } else {
        return [
            new Command(tokens.move())
        ];
    }
};
const defaultParams = Object.freeze({
    help: true,
    optionsFirst: false
});
const docopt = (doc1, init = {
})=>{
    const params = {
        ...defaultParams,
        ...init
    };
    params.argv = params.argv || processArgv();
    Exit.usage = printableUsage(doc1);
    const options = parseDefaults(doc1);
    const pattern = parsePattern(formalUsage(Exit.usage || ""), options);
    const argv = parseArgv(new TokenStream(params.argv, Exit), options, params.optionsFirst);
    const patternOptions = uniqueMap(pattern.flat(Option1));
    pattern.flat(AnyOptions).forEach((ao)=>{
        const docOptions = parseDefaults(doc1);
        ao.children = unique(docOptions.filter((o)=>!patternOptions.has(o.toString())
        ));
    });
    extras(params.help, params.version, argv.filter((x)=>x instanceof Option1
    ), doc1);
    let [matched, left, collected] = pattern.fix().match(argv);
    collected = collected || [];
    if (matched && left && left.length === 0) {
        return Object.fromEntries(pattern.flat().concat(collected).map((a)=>[
                a.name,
                a.value
            ]
        ));
    }
    throw new Exit();
};
const extras = (help, version, options, doc1)=>{
    if (help && options.filter((o)=>[
            "-h",
            "--help"
        ].includes(o.name)
    ).length > 0) {
        Exit.usage = undefined;
        throw new Exit(doc1.trim());
    }
    if (version && options.filter((o)=>o.name === "--version" && o.value
    ).length > 0) {
        Exit.usage = undefined;
        throw new Exit(version);
    }
};
const printableUsage = (doc1)=>{
    const usageSplit = doc1.split(/([Uu][Ss][Aa][Gg][Ee]:)/);
    if (usageSplit.length < 3) {
        throw new DocoptLanguageError('"usage:" (case-insensitive) not found.');
    }
    if (usageSplit.length > 3) {
        throw new DocoptLanguageError('More than one "usage:" (case-insensitive).');
    }
    return usageSplit.slice(1).join("").split(/\n\s*\n/)[0].trim();
};
const formalUsage = (printableUsage1)=>{
    const pu = printableUsage1.split(/\s+/g).slice(1);
    const ret = [];
    for (let s of pu.slice(1)){
        if (s === pu[0]) {
            ret.push(") | (");
        } else {
            ret.push(s);
        }
    }
    return `( ${ret.join(" ")} )`;
};
const yearMax = new Date().getFullYear();
const randomNumber = (min, max)=>Math.floor(Math.random() * (max - min + 1)) + min
;
const birthDate = ({ firstYear =1900 , lastYear =yearMax  } = {
})=>{
    const firstTime = new Date(`${firstYear}-01-01`).getTime();
    const lastTime = new Date(`${lastYear}-12-31`).getTime();
    return new Date(randomNumber(firstTime, lastTime));
};
const serialNumber = ()=>randomNumber(100, 999)
;
var Gender;
(function(Gender1) {
    Gender1[Gender1["female"] = 0] = "female";
    Gender1[Gender1["male"] = 1] = "male";
})(Gender || (Gender = {
}));
const calculateG = (year, gender)=>Math.floor(year / 100) * 2 - 34 - gender
;
function checksum(code) {
    var b = 1, c = 3, d = 0, e = 0, i, digit;
    for(i = 0; i < 10; i++){
        digit = parseInt(code[i]);
        d += digit * b;
        e += digit * c;
        b++;
        if (b == 10) b = 1;
        c++;
        if (c == 10) c = 1;
    }
    d = d % 11;
    e = e % 11;
    if (d < 10) {
        return d;
    } else if (e < 10) {
        return e;
    } else {
        return 0;
    }
}
const gender = ()=>{
    const values = Object.values(Gender).filter((n)=>Number.isInteger(n)
    ).map((n)=>n + 0
    );
    const index = randomNumber(0, values.length - 1);
    return values[index];
};
class Tokenizer {
    constructor(rules = []){
        this.rules = rules;
    }
    addRule(test, fn) {
        this.rules.push({
            test,
            fn
        });
        return this;
    }
    tokenize(string, receiver = (token)=>token
    ) {
        function* generator(rules1) {
            let index = 0;
            for (const rule of rules1){
                const result = rule.test(string);
                if (result) {
                    const { value: value3 , length  } = result;
                    index += length;
                    string = string.slice(length);
                    const token = {
                        ...rule.fn(value3),
                        index
                    };
                    yield receiver(token);
                    yield* generator(rules1);
                }
            }
        }
        const tokenGenerator = generator(this.rules);
        const tokens = [];
        for (const token of tokenGenerator){
            tokens.push(token);
        }
        if (string.length) {
            throw new Error(`parser error: string not fully parsed! ${string.slice(0, 25)}`);
        }
        return tokens;
    }
}
function digits(value3, count = 2) {
    return String(value3).padStart(count, "0");
}
function createLiteralTestFunction(value3) {
    return (string)=>{
        return string.startsWith(value3) ? {
            value: value3,
            length: value3.length
        } : undefined;
    };
}
function createMatchTestFunction(match) {
    return (string)=>{
        const result = match.exec(string);
        if (result) return {
            value: result,
            length: result[0].length
        };
    };
}
const defaultRules = [
    {
        test: createLiteralTestFunction("yyyy"),
        fn: ()=>({
                type: "year",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("yy"),
        fn: ()=>({
                type: "year",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("MM"),
        fn: ()=>({
                type: "month",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("M"),
        fn: ()=>({
                type: "month",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("dd"),
        fn: ()=>({
                type: "day",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("d"),
        fn: ()=>({
                type: "day",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("HH"),
        fn: ()=>({
                type: "hour",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("H"),
        fn: ()=>({
                type: "hour",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("hh"),
        fn: ()=>({
                type: "hour",
                value: "2-digit",
                hour12: true
            })
    },
    {
        test: createLiteralTestFunction("h"),
        fn: ()=>({
                type: "hour",
                value: "numeric",
                hour12: true
            })
    },
    {
        test: createLiteralTestFunction("mm"),
        fn: ()=>({
                type: "minute",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("m"),
        fn: ()=>({
                type: "minute",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("ss"),
        fn: ()=>({
                type: "second",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("s"),
        fn: ()=>({
                type: "second",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("SSS"),
        fn: ()=>({
                type: "fractionalSecond",
                value: 3
            })
    },
    {
        test: createLiteralTestFunction("SS"),
        fn: ()=>({
                type: "fractionalSecond",
                value: 2
            })
    },
    {
        test: createLiteralTestFunction("S"),
        fn: ()=>({
                type: "fractionalSecond",
                value: 1
            })
    },
    {
        test: createLiteralTestFunction("a"),
        fn: (value3)=>({
                type: "dayPeriod",
                value: value3
            })
    },
    {
        test: createMatchTestFunction(/^(')(?<value>\\.|[^\']*)\1/),
        fn: (match)=>({
                type: "literal",
                value: match.groups.value
            })
    },
    {
        test: createMatchTestFunction(/^.+?\s*/),
        fn: (match)=>({
                type: "literal",
                value: match[0]
            })
    }, 
];
class DateTimeFormatter {
    #format;
    constructor(formatString, rules1 = defaultRules){
        const tokenizer = new Tokenizer(rules1);
        this.#format = tokenizer.tokenize(formatString, ({ type , value: value3 , hour12  })=>{
            const result = {
                type,
                value: value3
            };
            if (hour12) result.hour12 = hour12;
            return result;
        });
    }
    format(date, options = {
    }) {
        let string = "";
        const utc = options.timeZone === "UTC";
        for (const token of this.#format){
            const type = token.type;
            switch(type){
                case "year":
                    {
                        const value3 = utc ? date.getUTCFullYear() : date.getFullYear();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value3;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value3, 2).slice(-2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "month":
                    {
                        const value3 = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value3;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value3, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "day":
                    {
                        const value3 = utc ? date.getUTCDate() : date.getDate();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value3;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value3, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "hour":
                    {
                        let value3 = utc ? date.getUTCHours() : date.getHours();
                        value3 -= token.hour12 && date.getHours() > 12 ? 12 : 0;
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value3;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value3, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "minute":
                    {
                        const value3 = utc ? date.getUTCMinutes() : date.getMinutes();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value3;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value3, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "second":
                    {
                        const value3 = utc ? date.getUTCSeconds() : date.getSeconds();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value3;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value3, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "fractionalSecond":
                    {
                        const value3 = utc ? date.getUTCMilliseconds() : date.getMilliseconds();
                        string += digits(value3, Number(token.value));
                        break;
                    }
                case "timeZoneName":
                    {
                        break;
                    }
                case "dayPeriod":
                    {
                        string += token.value ? date.getHours() >= 12 ? "PM" : "AM" : "";
                        break;
                    }
                case "literal":
                    {
                        string += token.value;
                        break;
                    }
                default:
                    throw Error(`FormatterError: { ${token.type} ${token.value} }`);
            }
        }
        return string;
    }
    parseToParts(string) {
        const parts = [];
        for (const token of this.#format){
            const type = token.type;
            let value3 = "";
            switch(token.type){
                case "year":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value3 = /^\d{1,4}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value3 = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                        }
                        break;
                    }
                case "month":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value3 = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value3 = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            case "narrow":
                                {
                                    value3 = /^[a-zA-Z]+/.exec(string)?.[0];
                                    break;
                                }
                            case "short":
                                {
                                    value3 = /^[a-zA-Z]+/.exec(string)?.[0];
                                    break;
                                }
                            case "long":
                                {
                                    value3 = /^[a-zA-Z]+/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "day":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value3 = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value3 = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "hour":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value3 = /^\d{1,2}/.exec(string)?.[0];
                                    if (token.hour12 && parseInt(value3) > 12) {
                                        console.error(`Trying to parse hour greater than 12. Use 'H' instead of 'h'.`);
                                    }
                                    break;
                                }
                            case "2-digit":
                                {
                                    value3 = /^\d{2}/.exec(string)?.[0];
                                    if (token.hour12 && parseInt(value3) > 12) {
                                        console.error(`Trying to parse hour greater than 12. Use 'HH' instead of 'hh'.`);
                                    }
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "minute":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value3 = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value3 = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "second":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value3 = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value3 = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "fractionalSecond":
                    {
                        value3 = new RegExp(`^\\d{${token.value}}`).exec(string)?.[0];
                        break;
                    }
                case "timeZoneName":
                    {
                        value3 = token.value;
                        break;
                    }
                case "dayPeriod":
                    {
                        value3 = /^(A|P)M/.exec(string)?.[0];
                        break;
                    }
                case "literal":
                    {
                        if (!string.startsWith(token.value)) {
                            throw Error(`Literal "${token.value}" not found "${string.slice(0, 25)}"`);
                        }
                        value3 = token.value;
                        break;
                    }
                default:
                    throw Error(`${token.type} ${token.value}`);
            }
            if (!value3) {
                throw Error(`value not valid for token { ${type} ${value3} } ${string.slice(0, 25)}`);
            }
            parts.push({
                type,
                value: value3
            });
            string = string.slice(value3.length);
        }
        if (string.length) {
            throw Error(`datetime string was not fully parsed! ${string.slice(0, 25)}`);
        }
        return parts;
    }
    sortDateTimeFormatPart(parts) {
        let result = [];
        const typeArray = [
            "year",
            "month",
            "day",
            "hour",
            "minute",
            "second",
            "fractionalSecond", 
        ];
        for (const type of typeArray){
            const current = parts.findIndex((el)=>el.type === type
            );
            if (current !== -1) {
                result = result.concat(parts.splice(current, 1));
            }
        }
        result = result.concat(parts);
        return result;
    }
    partsToDate(parts) {
        const date = new Date();
        const utc = parts.find((part)=>part.type === "timeZoneName" && part.value === "UTC"
        );
        utc ? date.setUTCHours(0, 0, 0, 0) : date.setHours(0, 0, 0, 0);
        for (const part of parts){
            switch(part.type){
                case "year":
                    {
                        const value3 = Number(part.value.padStart(4, "20"));
                        utc ? date.setUTCFullYear(value3) : date.setFullYear(value3);
                        break;
                    }
                case "month":
                    {
                        const value3 = Number(part.value) - 1;
                        utc ? date.setUTCMonth(value3) : date.setMonth(value3);
                        break;
                    }
                case "day":
                    {
                        const value3 = Number(part.value);
                        utc ? date.setUTCDate(value3) : date.setDate(value3);
                        break;
                    }
                case "hour":
                    {
                        let value3 = Number(part.value);
                        const dayPeriod = parts.find((part1)=>part1.type === "dayPeriod"
                        );
                        if (dayPeriod?.value === "PM") value3 += 12;
                        utc ? date.setUTCHours(value3) : date.setHours(value3);
                        break;
                    }
                case "minute":
                    {
                        const value3 = Number(part.value);
                        utc ? date.setUTCMinutes(value3) : date.setMinutes(value3);
                        break;
                    }
                case "second":
                    {
                        const value3 = Number(part.value);
                        utc ? date.setUTCSeconds(value3) : date.setSeconds(value3);
                        break;
                    }
                case "fractionalSecond":
                    {
                        const value3 = Number(part.value);
                        utc ? date.setUTCMilliseconds(value3) : date.setMilliseconds(value3);
                        break;
                    }
            }
        }
        return date;
    }
    parse(string) {
        const parts = this.parseToParts(string);
        const sortParts = this.sortDateTimeFormatPart(parts);
        return this.partsToDate(sortParts);
    }
}
const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
var Day;
(function(Day1) {
    Day1[Day1["Sun"] = 0] = "Sun";
    Day1[Day1["Mon"] = 1] = "Mon";
    Day1[Day1["Tue"] = 2] = "Tue";
    Day1[Day1["Wed"] = 3] = "Wed";
    Day1[Day1["Thu"] = 4] = "Thu";
    Day1[Day1["Fri"] = 5] = "Fri";
    Day1[Day1["Sat"] = 6] = "Sat";
})(Day || (Day = {
}));
function format(date, formatString1) {
    const formatter = new DateTimeFormatter(formatString1);
    return formatter.format(date);
}
function calculateMonthsDifference(bigger, smaller) {
    const biggerDate = new Date(bigger);
    const smallerDate = new Date(smaller);
    const yearsDiff = biggerDate.getFullYear() - smallerDate.getFullYear();
    const monthsDiff = biggerDate.getMonth() - smallerDate.getMonth();
    const calendarDifferences = Math.abs(yearsDiff * 12 + monthsDiff);
    const compareResult = biggerDate > smallerDate ? 1 : -1;
    biggerDate.setMonth(biggerDate.getMonth() - compareResult * calendarDifferences);
    const isLastMonthNotFull = biggerDate > smallerDate ? 1 : -1 === -compareResult ? 1 : 0;
    const months = compareResult * (calendarDifferences - isLastMonthNotFull);
    return months === 0 ? 0 : months;
}
function generateNIN(year, verbose) {
    const bdArg = year ? {
        firstYear: year,
        lastYear: year
    } : {
    };
    const bd = birthDate(bdArg);
    const gd = gender();
    if (verbose) {
        console.log(`Birth date: ${format(bd, "yyyy-MM-dd")}\n`, `   Gender: ${Gender[gd]}\n`);
    }
    const identificationNumber = calculateG(bd.getFullYear(), gd).toString() + format(bd, "yyMMdd") + serialNumber().toString();
    return identificationNumber + checksum(identificationNumber);
}
try {
    const args = docopt(doc);
    const year = typeof args["--year"] === "string" ? parseInt(args["--year"]) || null : null;
    const verbose = args["--verbose"] == true;
    console.log(generateNIN(year, verbose));
} catch (e) {
    console.error(e.message);
}
