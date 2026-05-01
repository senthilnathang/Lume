import { Injectable } from '@nestjs/common';

interface SemVersion {
  major: number;
  minor: number;
  patch: number;
}

@Injectable()
export class SemverService {
  private parseSemver(version: string): SemVersion | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  private compareVersions(v1: SemVersion, v2: SemVersion): number {
    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    return v1.patch - v2.patch;
  }

  satisfies(version: string, range: string): boolean {
    const v = this.parseSemver(version);
    if (!v) return false;

    // Remove whitespace
    range = range.trim();

    // Exact version
    if (!range.match(/[<>~^]/)) {
      const rangeV = this.parseSemver(range);
      if (!rangeV) return false;
      return this.compareVersions(v, rangeV) === 0;
    }

    // Caret (^) - compatible with version (allows minor and patch)
    if (range.startsWith('^')) {
      const baseVersion = this.parseSemver(range.slice(1));
      if (!baseVersion) return false;

      if (v.major !== baseVersion.major) return false;

      if (baseVersion.major === 0) {
        if (v.minor !== baseVersion.minor) return false;
        return v.patch >= baseVersion.patch;
      }

      return (
        v.minor > baseVersion.minor ||
        (v.minor === baseVersion.minor && v.patch >= baseVersion.patch)
      );
    }

    // Tilde (~) - compatible with version (allows patch)
    if (range.startsWith('~')) {
      const baseVersion = this.parseSemver(range.slice(1));
      if (!baseVersion) return false;

      if (v.major !== baseVersion.major || v.minor !== baseVersion.minor) {
        return false;
      }
      return v.patch >= baseVersion.patch;
    }

    // Greater than or equal (>=)
    if (range.startsWith('>=')) {
      const rangeV = this.parseSemver(range.slice(2));
      if (!rangeV) return false;
      return this.compareVersions(v, rangeV) >= 0;
    }

    // Greater than (>)
    if (range.startsWith('>')) {
      const rangeV = this.parseSemver(range.slice(1));
      if (!rangeV) return false;
      return this.compareVersions(v, rangeV) > 0;
    }

    // Less than or equal (<=)
    if (range.startsWith('<=')) {
      const rangeV = this.parseSemver(range.slice(2));
      if (!rangeV) return false;
      return this.compareVersions(v, rangeV) <= 0;
    }

    // Less than (<)
    if (range.startsWith('<')) {
      const rangeV = this.parseSemver(range.slice(1));
      if (!rangeV) return false;
      return this.compareVersions(v, rangeV) < 0;
    }

    return false;
  }

  isCompatible(currentVersion: string, requiredRange: string): boolean {
    return this.satisfies(currentVersion, requiredRange);
  }
}
