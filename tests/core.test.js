const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const timecodeHelper = require('../src/core/timecodeHelper.js');
const promptBuilder = require('../src/core/promptBuilder.js');
const comfyPayload = require('../src/core/comfyPayload.js');
const cloudDiagnostics = require('../src/core/cloudDiagnostics.js');

describe('H3 Storyboard Studio - Core Modules Unit Tests', () => {

  // ==================== 1. timecodeHelper ====================
  describe('timecodeHelper', () => {
    it('should correctly calculate segment time ranges', () => {
      assert.deepEqual(timecodeHelper.getSegmentTimeRange(0), { startSec: 0, endSec: 5, duration: 5 });
      assert.deepEqual(timecodeHelper.getSegmentTimeRange(1), { startSec: 5, endSec: 10, duration: 5 });
      assert.deepEqual(timecodeHelper.getSegmentTimeRange(2), { startSec: 10, endSec: 15, duration: 5 });
      assert.deepEqual(timecodeHelper.getSegmentTimeRange(3), { startSec: 15, endSec: 20, duration: 5 });
    });

    it('should correctly calculate total seconds and segment counts', () => {
      assert.equal(timecodeHelper.calculateTotalSeconds(3), 15);
      assert.equal(timecodeHelper.calculateTotalSeconds(4), 20);
      assert.equal(timecodeHelper.calculateSegmentCountFromSeconds(15), 3);
      assert.equal(timecodeHelper.calculateSegmentCountFromSeconds(20), 4);
      assert.equal(timecodeHelper.calculateSegmentCountFromSeconds(5), 1);
    });

    it('should format segment titles with Part prefix and timecodes', () => {
      const title1 = timecodeHelper.formatSegmentTitle(0, "甦醒伸展肩膀");
      assert.equal(title1, "Part 1 (0-5s): 甦醒伸展肩膀");

      // Preserves existing Part title without duplicate prefix
      const title2 = timecodeHelper.formatSegmentTitle(1, "Part 2 (5-10s): 雜耍沖繩苦瓜");
      assert.equal(title2, "Part 2 (5-10s): 雜耍沖繩苦瓜");
    });

    it('should calculate monotonically increasing default end panels and pin final to 9', () => {
      // 3 segments: 0 -> panel 4, 1 -> panel 6, 2 -> panel 9
      const p0 = timecodeHelper.calculateDefaultEndPanel(0, 3);
      const p1 = timecodeHelper.calculateDefaultEndPanel(1, 3);
      const p2 = timecodeHelper.calculateDefaultEndPanel(2, 3);

      assert.ok(p0 >= 1 && p0 <= 9);
      assert.ok(p1 >= p0 && p1 <= 9);
      assert.equal(p2, 9, "Final segment end_panel must be pinned to 9");
    });

    it('should validate segment structures and catch invalid fields', () => {
      const valid = [
        { title: "Part 1 (0-5s)", end_panel: 3, prompt: "Valid prompt" },
        { title: "Part 2 (5-10s)", end_panel: 9, prompt: "Another valid prompt" }
      ];
      assert.equal(timecodeHelper.validateSegments(valid).valid, true);

      const invalid = [
        { title: "", end_panel: 12, prompt: "" }
      ];
      const res = timecodeHelper.validateSegments(invalid);
      assert.equal(res.valid, false);
      assert.ok(res.errors.length >= 2);
    });
  });

  // ==================== 2. promptBuilder ====================
  describe('promptBuilder', () => {
    it('should build director system prompt with expand mode requirements', () => {
      const prompt = promptBuilder.buildDirectorSystemPrompt('expand', 20);
      assert.ok(prompt.includes("total video duration of 20 seconds"));
      assert.ok(prompt.includes("4 sequential 5-second segments"));
      assert.ok(prompt.includes("3x3 nine-panel photo grid"));
      assert.ok(prompt.includes(promptBuilder.CONTINUITY_PHRASE));
    });

    it('should ensure continuity prefix is applied to segments 2..N', () => {
      const seg0 = "Cinematic opening scene establishing character.";
      const seg1Raw = "Subject continues juggling and looks to camera.";

      // Segment 0 does not enforce continuity prefix
      assert.equal(promptBuilder.ensureContinuityPrefix(0, seg0), seg0);

      // Segment 1 enforces continuity prefix
      const seg1Guaranteed = promptBuilder.ensureContinuityPrefix(1, seg1Raw);
      assert.ok(seg1Guaranteed.startsWith(promptBuilder.CONTINUITY_PHRASE));

      // Does not duplicate prefix if already present
      const seg1AlreadyGood = `${promptBuilder.CONTINUITY_PHRASE}, smooth movement forward.`;
      assert.equal(promptBuilder.ensureContinuityPrefix(1, seg1AlreadyGood), seg1AlreadyGood);
    });

    it('should wrap and extract Chinese dialogue tags', () => {
      const wrapped = promptBuilder.wrapDialogueTag("坐太久活動一下");
      assert.equal(wrapped, "<d>[Chinese] 坐太久活動一下</d>");

      const promptText = `Timeline: 2.0-5.0s Shisa smiles and speaks: ${wrapped}. Audio: authentic speech: ${wrapped}.`;
      const extracted = promptBuilder.extractDialogueTags(promptText);
      assert.deepEqual(extracted, ["坐太久活動一下", "坐太久活動一下"]);
    });

    it('should clean markdown backticks and parse JSON safely', () => {
      const raw = "```json\n{\n  \"project_slug\": \"test_slug\",\n  \"recommended_total_seconds\": 15\n}\n```";
      const parsed = promptBuilder.cleanAndParseJson(raw);
      assert.equal(parsed.project_slug, "test_slug");
      assert.equal(parsed.recommended_total_seconds, 15);
    });
  });

  // ==================== 3. comfyPayload ====================
  describe('comfyPayload', () => {
    it('should build a valid ComfyUI prompt API graph structure', () => {
      const segments = [
        { title: "Part 1 (0-5s)", end_panel: 3, prompt: "P1" },
        { title: "Part 2 (5-10s)", end_panel: 9, prompt: "P2" }
      ];
      const payload = comfyPayload.buildComfyApiPrompt("test_grid.png", segments, { steps: 8, layers: 12 }, "test/output");

      assert.ok(payload["3"], "Must contain LoadImage node 3");
      assert.equal(payload["3"].class_type, "LoadImage");
      assert.equal(payload["3"].inputs.image, "test_grid.png");

      assert.ok(payload["1"], "Must contain H3ChainedStoryboardVideo node 1");
      assert.equal(payload["1"].class_type, "H3ChainedStoryboardVideo");
      assert.equal(payload["1"].inputs.steps, 8);
      assert.equal(payload["1"].inputs.layers, 12);
      assert.equal(payload["1"].inputs.ssd_streaming, true);
      assert.deepEqual(payload["1"].inputs.storyboard_grid, ["3", 0]);

      assert.ok(payload["2"], "Must contain SaveVideo node 2");
      assert.equal(payload["2"].class_type, "SaveVideo");
      assert.equal(payload["2"].inputs.filename_prefix, "test/output");
      assert.deepEqual(payload["2"].inputs.video, ["1", 0]);
    });

    it('should throw error if filename is missing or segments are empty', () => {
      assert.throws(() => {
        comfyPayload.buildComfyApiPrompt("", [{ title: "P1", end_panel: 1, prompt: "A" }]);
      }, /uploadedGridFilename/);

      assert.throws(() => {
        comfyPayload.buildComfyApiPrompt("grid.png", []);
      }, /segments/);
    });
  });

  // ==================== 4. cloudDiagnostics ====================
  describe('cloudDiagnostics', () => {
    it('should detect ComfyUI connection failure and provide action guide', () => {
      const diag = cloudDiagnostics.diagnoseNetworkError(new Error("Failed to fetch"), { url: "http://127.0.0.1:8188/prompt" });
      assert.equal(diag.isComfy, true);
      assert.equal(diag.isCors, true);
      assert.ok(diag.action.includes("一鍵啟動_H3分鏡工作坊.command"));
    });

    it('should detect 401/403 authorization failures', () => {
      const diag = cloudDiagnostics.diagnoseNetworkError(new Error("Unauthorized"), { status: 401 });
      assert.equal(diag.isAuth, true);
      assert.ok(diag.title.includes("API 金鑰"));
    });

    it('should detect 429 rate limit quota errors', () => {
      const diag = cloudDiagnostics.diagnoseNetworkError(new Error("Resource has been exhausted (e.g. check quota)"), { status: 429 });
      assert.ok(diag.title.includes("超出限制"));
    });
  });

});
