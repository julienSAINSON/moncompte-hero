(function () {
    const tests = [];

    function format(value) {
        try {
            return JSON.stringify(value);
        } catch (_) {
            return String(value);
        }
    }

    window.test = function (name, fn) {
        tests.push({ name: name, fn: fn });
    };

    window.assert = {
        ok(condition, message) {
            if (!condition) {
                throw new Error(message || "Assertion failed");
            }
        },
        equal(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(
                    (message || "Values are not equal") +
                    " | actual=" + format(actual) +
                    " expected=" + format(expected)
                );
            }
        },
        deepEqual(actual, expected, message) {
            const left = format(actual);
            const right = format(expected);

            if (left !== right) {
                throw new Error(
                    (message || "Values are not deeply equal") +
                    " | actual=" + left +
                    " expected=" + right
                );
            }
        }
    };

    window.runTests = async function () {
        const report = document.getElementById("test-report");
        const summary = document.getElementById("test-summary");

        let passed = 0;
        let failed = 0;

        for (const t of tests) {
            const row = document.createElement("div");
            row.className = "test-row";

            try {
                await t.fn();
                passed++;
                row.classList.add("pass");
                row.textContent = "PASS - " + t.name;
            } catch (error) {
                failed++;
                row.classList.add("fail");
                row.textContent = "FAIL - " + t.name + " -> " + error.message;
                console.error(error);
            }

            report.appendChild(row);
        }

        summary.textContent =
            "Total: " + (passed + failed) +
            " | PASS: " + passed +
            " | FAIL: " + failed;

        document.body.dataset.testsFailed = String(failed);
    };
})();
