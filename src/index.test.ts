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

test('does not add weird newlines', () => {
    const result = HtmlDiff.create(
        `<h1>AVVITES</h1><p>1. Ancient people who lived in villages near Gaza before they were largely destroyed by a Philistine invasion (<span id="bibleref-5f2e22f9-25cc-4a3c-ab3a-df6da89c9bb7" data-bntype="bibleReference" data-startverse="1005002023" data-endverse="1005002023" style="color: green" onclick="onBibleReferenceClick('bibleref-5f2e22f9-25cc-4a3c-ab3a-df6da89c9bb7', '1005002023', '1005002023')">Dt 2:23</span>; <span id="bibleref-c0f7ab39-675f-45f6-8a3d-8509920adf64" data-bntype="bibleReference" data-startverse="1006013003" data-endverse="1006013003" style="color: green" onclick="onBibleReferenceClick('bibleref-c0f7ab39-675f-45f6-8a3d-8509920adf64', '1006013003', '1006013003')">Jos 13:3</span>).</p><p>2. Designation for the inhabitants of the Syrian district of Avva who were relocated by Shalmaneser of Assyria in Samaria after its conquest in 722 BC (<span id="bibleref-80211c41-a973-4a19-b9ad-a7396374e778" data-bntype="bibleReference" data-startverse="1012017031" data-endverse="1012017031" style="color: green" onclick="onBibleReferenceClick('bibleref-80211c41-a973-4a19-b9ad-a7396374e778', '1012017031', '1012017031')">2&nbsp;Kgs 17:31</span>). <em>See</em> <span data-bntype="resourceReference" data-resourceid="3057" data-resourcetype="tyndaleBibleDictionary" style="color: blue">Avva</span>.</p>`,
        `<h1>AVVITESs</h1><p>1. Ancient people who lived in villages near Gaza before they were largely destroyed by a Philistine invasion (<span id="bibleref-4101396f-1723-49c3-bf5b-b7d81c0f5cf0" data-bntype="bibleReference" data-startverse="1005002023" data-endverse="1005002023" style="color: green" onclick="onBibleReferenceClick('bibleref-4101396f-1723-49c3-bf5b-b7d81c0f5cf0', '1005002023', '1005002023')">Dt 2:23</span>; <span id="bibleref-d5c2d5d6-f199-407c-98a2-594af0a3e8d7" data-bntype="bibleReference" data-startverse="1006013003" data-endverse="1006013003" style="color: green" onclick="onBibleReferenceClick('bibleref-d5c2d5d6-f199-407c-98a2-594af0a3e8d7', '1006013003', '1006013003')">Jos 13:3</span>).</p><p>2. Designation for the inhabitants of the Syrian district of Avva who were relocated by Shalmaneser of Assyria in Samaria after its conquest in 722 BC (<span id="bibleref-c4ea9367-7db6-44de-bf42-35a8e751cb26" data-bntype="bibleReference" data-startverse="1012017031" data-endverse="1012017031" style="color: green" onclick="onBibleReferenceClick('bibleref-c4ea9367-7db6-44de-bf42-35a8e751cb26', '1012017031', '1012017031')">2&nbsp;Kgs 17:31</span>). <em>See</em> <span data-bntype="resourceReference" data-resourceid="3057" data-resourcetype="tyndaleBibleDictionary" style="color: blue">Avva</span>.</p>`
    ).build();

    expect(result).toBe(
        `<h1><del class="diffmod">AVVITES</del><ins class="diffmod">AVVITESs</ins></h1><p>1. Ancient people who lived in villages near Gaza before they were largely destroyed by a Philistine invasion (<span id="bibleref-4101396f-1723-49c3-bf5b-b7d81c0f5cf0" data-bntype="bibleReference" data-startverse="1005002023" data-endverse="1005002023" style="color: green" onclick="onBibleReferenceClick('bibleref-4101396f-1723-49c3-bf5b-b7d81c0f5cf0', '1005002023', '1005002023')">Dt 2:23</span>; <span id="bibleref-d5c2d5d6-f199-407c-98a2-594af0a3e8d7" data-bntype="bibleReference" data-startverse="1006013003" data-endverse="1006013003" style="color: green" onclick="onBibleReferenceClick('bibleref-d5c2d5d6-f199-407c-98a2-594af0a3e8d7', '1006013003', '1006013003')">Jos 13:3</span>).</p><p>2. Designation for the inhabitants of the Syrian district of Avva who were relocated by Shalmaneser of Assyria in Samaria after its conquest in 722 BC (<span id="bibleref-c4ea9367-7db6-44de-bf42-35a8e751cb26" data-bntype="bibleReference" data-startverse="1012017031" data-endverse="1012017031" style="color: green" onclick="onBibleReferenceClick('bibleref-c4ea9367-7db6-44de-bf42-35a8e751cb26', '1012017031', '1012017031')">2&nbsp;Kgs 17:31</span>). <em>See</em> <span data-bntype="resourceReference" data-resourceid="3057" data-resourcetype="tyndaleBibleDictionary" style="color: blue">Avva</span>.</p>`
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
        `<p>one two three four five six<del class=\"diffdel\">.<br><br>seven eight nine ten</del>.</p><p>eleven twelve thirteen.</p><p>fourteen fifteen sixteen.</p>`
    );
});
