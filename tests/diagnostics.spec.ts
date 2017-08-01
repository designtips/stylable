import { expect } from "chai";
import { process } from '../src/postcss-process';

import { safeParse } from "../src/parser";

const customButton = `
                    .root{
                        -st-states:shmover;
                    }
                    .my-part{

                    }
                    .my-variant{
                        -st-variant:true;
                        color:red;
                    }
                    
                `;
const mixins = `


`
interface warning {
    message: string;
    file: string;
}

interface file {
    content: string;
    path: string;
}

function findTestLocations(src: string) {
    var line = 1;
    var column = 1;
    var start;
    var end;
    for (var i = 0; i < src.length; i++) {
        var ch = src.charAt(i);
        if (ch === '\n') {
            line += 1;
            column = 0;
        }
        if (ch === '|') {
            if (!start) {
                start = { line, column };
            } else {
                end = { line, column };
            }
        } else {
            column++;
        }
    }
    if (!end) {
        end = { line, column };
    }

    return { start, end };
}


describe('findTestLocations', () => {

    it('find single location', function () {

        expect(findTestLocations('\n  |a|')).to.eql({
            start: { line: 2, column: 3 },
            end: { line: 2, column: 4 }
        });

    });

    it('find single location', function () {

        expect(findTestLocations('\n  |a\n  |')).to.eql({
            start: { line: 2, column: 3 },
            end: { line: 3, column: 3 }
        });

    });

})


function expectWarnings(src: string, warnings: warning[], extraFiles?: file[]) {

    var source = findTestLocations(src);
    var root = safeParse(src.replace(/\|/gm, ''));
    var res = process(root);

    res.diagnostics.reports.forEach((report, i) => {
        expect(report.message).to.equal(warnings[i].message);
        expect(report.node.source.start).to.eql(source.start);
    });

    expect(res.diagnostics.reports.length, "diagnostics reports match").to.equal(warnings.length);

    console.log(src, warnings, extraFiles);
}

describe('diagnostics: warnings and errors', function () {

    xdescribe('syntax', function () {

        describe('selectors', function () {
            it('should return warning for unidentified tag selector', function () {
                expectWarnings(`
                    |Something| {

                    }
                `, [{ message: '"Something" component is not imported', file: "main.css" }]);
            });

            it('should return warning for unterminated "."', function () {
                expectWarnings(`
                    .root{

                    }
                    .|
                `, [{ message: "identifier expected", file: "main.css" }]);
            });
            it('should return warning for unterminated ":"', function () {
                expectWarnings(`
                    .root{

                    }
                    :|
                `, [{ message: "identifier expected", file: "main.css" }])
            });
            it('should return warning for className without rule area', function () {
                expectWarnings(`
                    .root{

                    }
                    .gaga|
                `, [{ message: "{ expected", file: "main.css" }])
            });

        });
        describe('ruleset', function () {
            it('should return warning for unterminated ruleset', function () {
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:red|
                `, [{ message: "; expected", file: "main.css" }])
            });
        });
        describe('rules', function () {
            it('should return warning for unterminated rule', function () {
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color|
                    }
                `, [{ message: ": expected", file: "main.css" }])
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:|
                    }
                `, [{ message: "property value expected", file: "main.css" }])
                // todo: add cases for any unterminated selectors (direct descendant, etc...)
            });
            it('should return warning for unknown rule', function () {
                expectWarnings(`
                    .root{
                        |hello|:yossi;
                    }
                `, [{ message: 'unknown rule "hello"', file: "main.css" }])
            });

            it('should warn when using illegal characters', function () {
                expectWarnings(`
                    <|{

                    }
                `, [{ message: 'illegal character <', file: "main.css" }])
            });

            it('should return warning for unknown directive', function () {
                expectWarnings(`
                    .gaga{
                        |-st-something|:true;
                    }
                `, [{ message: 'unknown directive "-st-something"', file: "main.css" }])
            })
        });
        describe('states', function () {
            it('should return warning for state without selector', function () {
                expectWarnings(`
                    |:hover|{

                    }
                `,[{ message: 'global states are not supported, use .root:hover instead', file: "main.css" }])
            });

            it('should return warning for unknown state', function () {
                expectWarnings(`
                    .root:|shmover|{

                    }
                `, { message: 'unknown state "shmover"', file: "main.css" })
            });
        });
        describe('pseudo selectors', function () {
            it('should return warning for native pseudo elements without selector', function () {
                expectWarnings(`
                    |::before|{

                    }
                `, { message: 'global pseudo elements are not allowed, you can use ".root::before" instead', file: "main.css" })
            });

            it('should return warning for unknown pseudo element', function () {
                expectWarnings(`
                    .root::|mybtn|{

                    }
                `, { message: 'unknown pseudo element "mybtn"', file: "main.css" })
            });

            it('should return warning for unknown pseudo element', function () {
                expectWarnings(`
                    .root::|mybtn|{

                    }
                `, { message: 'unknown pseudo element "mybtn"', file: "main.css" })
            });
        });

    })

    describe('structure', function () {

        describe('root', function () {
            it('should return warning for ".root" after selector', function () {
                expectWarnings(`
                    |.gaga .root|{

                    }
                    
                `, [{ message: '.root can only be used as the root of the component', file: "main.css" }])
            });


        });
        describe('-st-states', function () {
            it('should return warning when defining states in complex selector', function () {
                expectWarnings(`
                    .gaga:hover{
                        |-st-states|:shmover;
                    }
                `, [{ message: 'cannot define pseudo states inside complex selectors', file: "main.css" }])
            });
        });
        describe('-st-mixin', function () {
            it('should return warning for unknown mixin', function () {
                expectWarnings(`
                    .gaga{
                        -st-mixin:|myMixin|;
                    }
                `, [{ message: 'unknown mixin: "myMixin"', file: "main.css" }])
            });

        });
        describe(':vars', function () {
            it('should return warning for unknown var', function () {
                expectWarnings(`
                    .gaga{
                        color:|value(myColor)|;
                    }
                `, [{ message: 'unknown var "myColor"', file: "main.css" }])
            });

            it('should return warning when defined in a complex selector', function () {
                expectWarnings(`
                    |.gaga:vars|{
                        myColor:red;
                    }
                    
                `, [{ message: 'cannot define "vars" inside a complex selector', file: "main.css" }])
            });
        });
        describe('-st-variant', function () {
            it('should return warning when defining variant in complex selector', function () {
                expectWarnings(`
                    .gaga:hover{
                        |-st-variant|:true;
                    }
                `, [{ message: 'cannot define "-st-variant" inside complex selector', file: "main.css" }])
            });

            it('should return warning when -st-variant value is not true or false', function () {
                expectWarnings(`
                    .gaga {
                        -st-variant:|red|;
                    }
                `, [{ message: '-st-variant can only be true or false, the value "red" is illegal', file: "main.css" }])
            });
        });
        describe(':import', function () {
            it('should return warning for unknown file', function () {
                expectWarnings(`

                    :import{
                        -st-from:|"./file"|;
                        -st-default:Theme;
                    }
                `, [{ message: 'could not find file "./file"', file: "main.css" }])
            });
            it('should return warning when defined in a complex selector', function () {
                expectWarnings(`
                    |.gaga:import|{
                        -st-from:"./file";
                        -st-default:Theme;
                    }
                `, [{ message: 'cannot define ":import" inside complex selector', file: "main.css" }])
            })
            it('should return warning for unknown import', function () {
                expectWarnings(`

                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:|variant|;
                    }
                `, [{ message: 'cannot find export "variant" in "./file"', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }]);
            });
            it('should return warning for non import rules inside imports', function () {
                expectWarnings(`

                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        |color|:red
                    }
                `, [{ message: '"color" css attribute cannot be used inside import block', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

            it('should return warning for import with missing "from"', function () {
                expectWarnings(`

                    :import{
                        -st-default:Comp;
                    }
                `, [{ message: '"-st-from" is missing in import block', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

        });

        describe('-st-extend', function () {
            it('should return warning when defined under complex selector', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    }
                    .root:hover{
                        |-st-extend|:Comp;
                    }
                `, [{ message: 'cannot define "-sb-extend" inside complex selector', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });
        });
    });

    describe('complex examples', function () {
        describe('cross variance', function () {
            it('variant cannot be used as var', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        color:|value(my-variant)|;
                    }
                `, [{ message: '"my-variant" is a variant and cannot be used as a var', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });
            it('mixin cannot be used as var', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:my-mixin;
                    }
                    .root{
                        color:|value(my-mixin)|;
                    }
                `, [{ message: '"my-mixin" is a mixin and cannot be used as a var', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });
            it('mixin cannot be used as stylesheet', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:my-mixin;
                    }
                    .root{
                        -st-extend:|my-mixin|;
                    }
                `, [{ message: '"my-mixin" is a mixin and cannot be used as a stylesheet', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });
            it('stylesheet cannot be used as var', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    .root{
                        color:|value(Comp)|;
                    }
                `, [{ message: '"Comp" is a stylesheet and cannot be used as a var', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });
            it('stylesheet cannot be used as mixin', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        -st-mixin:|Comp|;
                    }
                `, [{ message: '"Comp" is a stylesheet and cannot be used as a mixin', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });
            it('component variant cannot be used for native node', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    
                    .gaga{
                        -st-mixin:|my-variant|;
                    }
                `, [{
                        message: '"my-variant" cannot be applied to ".gaga", ".gaga" refers to a native node and "my-variant" can only be spplied to "@namespace of comp"',
                        file: "main.css"
                    }]
                    , [{ content: customButton, path: 'file.css' }])

            });
            it('variants can only be used for a specific component', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    :import{
                        -st-from:"./file2";
                        -st-default:Comp2;
                        -st-named:my-variant2;
                    }
                    .gaga{
                        -st-extends:Comp;
                        -st-apply:|my-variant2|;
                    }
                `, [{
                        message: '"my-variant2" cannot be applied to ".gaga", ".gaga" refers to "@namespace of comp" and "my-variant" can only be spplied to "@namespace of Comp2"',
                        file: "main.css"
                    }]
                    , [
                        { content: customButton, path: 'file.css' }, { content: customButton, path: 'file2.css' }])

            });
            it('variant cannot be used with params', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        -st-extend:Comp;
                        -st-mixin:|my-variant(param)|;
                    }
                `, [{ message: 'invalid mixin arguments: "my-variant" is a variant and does not accept arguments', file: "main.css" }])

            });
            it('mixins cant be used with wrong number of params', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:mixinWith2Args;
                    }
                    .root{
                        -st-mixin:|mixinWith2Args(param)|;
                    }
                `, [{ message: 'invalid mixin arguments: "mixinWith2Args" expects 2 arguments but recieved 1', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });
            it('error running mixin', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:mixinThatExplodes;
                    }
                    .root{
                        -st-mixin:|mixinThatExplodes(param)|;
                    }
                `, [{ message: '"mixinThatExplodes" has thrown an error: error text', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });
        });

    });

    describe('selectors', function () {

        it('should not allow conflicting extends', function () {
            expectWarnings(`
                :import {
                    -st-from: "./sheetA";
                    -st-named: SheetA;
                }
                :import {
                    -st-from: "./sheetB";
                    -st-named: SheetB;
                }
                .my-a { -st-extends: SheetA }
                .my-b { -st-extends: SheetB }

                .my-a.my-b {}
                SheetA.my-b {}
                SheetB.my-a {}
            `, [
                    { message: 'conflicting extends matching same target [.my-a.my-b]', file: "main.css" },
                    { message: 'conflicting extends matching same target [SheetA.my-b]', file: "main.css" },
                    { message: 'conflicting extends matching same target [SheetB.my-a]', file: "main.css" }
                ]
                , [
                    { content: '.root{}', path: 'sheetA.ts' },
                    { content: '.root{}', path: 'sheetB.ts' }
                ]);
        });

    });

});