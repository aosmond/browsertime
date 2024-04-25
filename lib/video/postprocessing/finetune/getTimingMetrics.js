import { isAndroidConfigured } from '../../../android/index.js';
import { getFont } from './getFont.js';
import { jsonifyKeyColorFrames } from '../../../support/util.js';

function isSmallish(options) {
  return (
    (options.chrome &&
      options.chrome.mobileEmulation &&
      options.chrome.mobileEmulation.deviceName) ||
    isAndroidConfigured(options)
  );
}

function get(metricName, pos, options, start, end) {
  // We need the fontfile running Android from a Mac
  const fontFile = getFont(options);
  let fontSize = 18;
  let x = 8;
  if (isSmallish(options)) {
    fontSize = 32;
    x = 10;
  }
  if (options.safari && options.safari.useSimulator) {
    fontSize = 32;
    x = 10;
  }

  // Adjust the range by 1ms to ensure it displays on the correct frames.
  let range = Number.isFinite(end)
    ? `between(t,${(Number(start) - 1) / 1000},${(Number(end) - 1) / 1000})`
    : `gte(t,${(Number(start) - 1) / 1000})`;
  // H-h/8
  return `drawtext=${fontFile}enable='${range}':x=(w-tw)/2: y=H-${pos}-h/${x}:fontcolor=white:fontsize=h/${fontSize}:box=1:boxcolor=0x000000AA:boxborderw=2:text='${metricName} ${start}'`;
}

export function getTimingMetrics(videoMetrics, timingMetrics, options) {
  let text = '';
  const vm = videoMetrics.visualMetrics;
  const startPosition = 'h/10';
  const metricsAndValues = [];
  const metricsKeyColors = [];

  if (options.visualMetrics) {
    metricsAndValues.push(
      {
        name: 'FirstVisualChange',
        value: vm.FirstVisualChange
      },
      { name: 'SpeedIndex', value: vm.SpeedIndex },
      {
        name: 'VisualComplete85',
        value: vm.VisualComplete85
      },
      {
        name: 'LastVisualChange',
        value: vm.LastVisualChange
      }
    );

    if (vm.KeyColorFrames) {
      let keyColorFrames = jsonifyKeyColorFrames(vm.KeyColorFrames);
      for (let key in keyColorFrames) {
        for (let frame of keyColorFrames[key]) {
          let start = frame.startTimestamp;
          let end =
            frame.endTimestamp > start
              ? frame.endTimestamp - 1
              : Number.POSITIVE_INFINITY;
          metricsKeyColors.push({ name: `KeyColorFrame(${key})`, start, end });
        }
      }
    }
  }

  if (vm.LargestContentfulPaint) {
    metricsAndValues.push({
      name: 'LargestContentfulPaint',
      value: vm.LargestContentfulPaint
    });
  } else if (timingMetrics) {
    const pt = timingMetrics;
    metricsAndValues.push({
      name: 'DOMContentLoaded',
      value: pt.domContentLoadedTime
    });
  }

  metricsAndValues.sort(function (a, b) {
    return b.value - a.value;
  });

  metricsKeyColors.sort(function (a, b) {
    return b.start - a.start;
  });

  let pos = startPosition;

  let posOffset = isSmallish(options) ? 24 : 14;

  if (options.safari && options.safari.useSimulator) {
    posOffset = 24;
  }

  // There is only one key color per frame, so they should never overlap.
  for (let frame of metricsKeyColors) {
    text += ',' + get(frame.name, pos, options, frame.start, frame.end);
  }

  if (metricsKeyColors.length > 0) {
    pos += `-h/${posOffset}`;
  }

  for (let metricAndValue of metricsAndValues) {
    text += ',' + get(metricAndValue.name, pos, options, metricAndValue.value);
    pos += `-h/${posOffset}`;
  }

  return text;
}
