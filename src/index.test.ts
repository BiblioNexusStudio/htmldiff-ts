import { expect, test } from 'bun:test';
import HtmlDiff from './html-diff';

test('works for basic example', () => {
    const result = HtmlDiff.create(
        `<i>Existing buildings </i>that undergo a change of group or occupancy shall comply with this section.<ul class="exception"><li><b>Exception: </b>Type B dwelling or sleeping units required by Section 1107 of the <i>International Building Code </i>are not required to be provided in <i>existing buildings </i>and facilities undergoing a <i>change of occupancy </i>in conjunction with <i>alterations </i>where the <i>work area </i>is 50 percent or less of the aggregate area of the building.</li></ul>`,
        `<em>Where existing buildings </em>undergo a change of group or occupancy any alterations shall comply with Sections 410.6, 410.7 and 410.8 as applicable.`
    ).build();

    expect(result).toBe(
        '<i class="diffmod"><del class="diffmod">Existing</del><em class="diffmod"><ins class="diffmod">Where existing</ins> buildings </i><del class="diffmod">that </del></em>undergo a change of group or occupancy <ins class="diffins">any alterations </ins>shall comply with <del class="diffmod">this section</del><ins class="diffmod">Sections 410.6, 410.7 and 410.8 as applicable</ins>.<ul class="diffmod exception"><li><b><del class="diffdel">Exception: </del></b><del class="diffdel">Type B dwelling or sleeping units required by Section 1107 of the </del><i class="diffmod"><del class="diffdel">International Building Code </del></i><del class="diffdel">are not required to be provided in </del><i class="diffmod"><del class="diffdel">existing buildings </del></i><del class="diffdel">and facilities undergoing a </del><i class="diffmod"><del class="diffdel">change of occupancy </del></i><del class="diffdel">in conjunction with </del><i class="diffmod"><del class="diffdel">alterations </del></i><del class="diffdel">where the </del><i class="diffmod"><del class="diffdel">work area </del></i><del class="diffdel">is 50 percent or less of the aggregate area of the building.</del></li></ul>'
    );
});

test('works for link', () => {
    const result = HtmlDiff.create(
        `Testing <a href="http://google.com">Link Changes</a> And when the link <a href="http://samelink.com">stays the same</a>`,
        `Testing <a href="http://caxy.com">Link Changes</a> And when the link <a href="http://samelink.com">stays the same</a>`
    ).build();

    expect(result).toBe(
        `Testing <del class="diffmod diffa diffhref"><a href="http://google.com">Link Changes</a></del><ins class="diffmod diffa diffhref"><a href="http://caxy.com">Link Changes</a></ins> And when the link <a href="http://samelink.com">stays the same</a>`
    );
});

test('works with apostrophes', () => {
    const result = HtmlDiff.create(`<p>this's a apost</p>`, `<p>this's a apost</p>`).build();

    expect(result).toBe(`<p>this's a apost</p>`);
});

test('works with paragraphs being combined', () => {
    const result = HtmlDiff.create(
        `<p>one two three</p><p>four five six</p>`,
        `<p>one two three four five six</p>`
    ).build();

    expect(result).toBe(`<p>one two three<del class=\"diffmod\">¶</del>four five six</p>`);
});

test('works with paragraphs being split', () => {
    const result = HtmlDiff.create(
        `<p>one two three four five six</p>`,
        `<p>one two three</p><p>four five six</p>`
    ).build();

    expect(result).toBe(`<p>one two three<ins class=\"diffmod\">¶</ins></p><p>four five six</p>`);
});

test('works when deleting a paragraph', () => {
    const result = HtmlDiff.create(
        `<p>one two three four five six.</p><p>seven eight nine ten.</p><p>eleven twelve thirteen.</p><p>fourteen fifteen sixteen.</p>`,
        `<p>one two three four five six.</p><p>eleven twelve thirteen.</p><p>fourteen fifteen sixteen.</p>`
    ).build();

    expect(result).toBe(
        `<p>one two three four five six<del class=\"diffdel\">.<br><br>seven eight nine ten</del>.</p><br><p>eleven twelve thirteen.</p><br><p>fourteen fifteen sixteen.</p>`
    );
});
