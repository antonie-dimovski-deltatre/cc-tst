import os
import sys
import semver
import subprocess
import re

script_dir = os.path.dirname(os.path.abspath(__file__))
base_path = os.path.join(script_dir, '..', 'packages')


def bump_version(version, release_level, is_prerelease, bump_prerelease):
    ver_info = semver.VersionInfo.parse(version)
    if is_prerelease:
        if bump_prerelease:
            return str(ver_info.bump_prerelease())
        else:
            finalized_version = ver_info.finalize_version()
            if release_level == 'major':
                return str(finalized_version.bump_major())
            elif release_level == 'minor':
                return str(finalized_version.bump_minor())
            elif release_level == 'patch':
                return str(finalized_version.bump_patch())
    else:
        if release_level == 'major':
            return str(ver_info.bump_major())
        elif release_level == 'minor':
            return str(ver_info.bump_minor())
        elif release_level == 'patch':
            return str(ver_info.bump_patch())


def get_latest_tag(package_path):
    try:
        subprocess.check_output(["git", "fetch", "--tags"], cwd=package_path)

        tags = subprocess.check_output(
            ["git", "tag", "--sort=-v:refname"], cwd=package_path).decode().strip().split('\n')
        version_pattern = r"@foo/[\w-]+@(\d+\.\d+\.\d+)(-\w+\.\d+)?"
        for tag in tags:
            match = re.search(version_pattern, tag)
            if match:
                version = match.group(
                    1) + (match.group(2) if match.group(2) else '')
                return version
        return None
    except subprocess.CalledProcessError as e:
        print(f"Error retrieving tags: {str(e)}")
        return None


def tag_new_version(package_path, new_version):
    package_name = os.path.basename(package_path)
    tag_name = f"@foo/{package_name}@{new_version}"
    try:
        subprocess.check_call(["git", "tag", "-f", tag_name], cwd=package_path)
        subprocess.check_call(["git", "push", "--force", "origin", tag_name])
    except subprocess.CalledProcessError as e:
        print(
            f"Failed to tag or push new version for {package_path}: {str(e)}")


def main(release_level, library, bump_prerelease):
    if library:
        package_paths = [os.path.join(base_path, library)]
    else:
        package_paths = [os.path.join(base_path, name) for name in os.listdir(
            base_path) if os.path.isdir(os.path.join(base_path, name))]

    for package_path in package_paths:
        latest_version = get_latest_tag(package_path)
        if latest_version:
            is_prerelease = '-' in latest_version.split('@')[-1]
            new_version = bump_version(
                latest_version, release_level, is_prerelease, bump_prerelease)
            tag_new_version(package_path, new_version)
            print(
                f"Updated {os.path.basename(package_path)} to version {new_version}")
        else:
            print(
                f"No valid semver tags found in {os.path.basename(package_path)}")


if __name__ == "__main__":
    release_level = "patch"
    library = None
    bump_prerelease = False

    if len(sys.argv) > 1:
        release_level = sys.argv[1]
    if len(sys.argv) > 2:
        library = sys.argv[2]
    if len(sys.argv) > 3:
        bump_prerelease = sys.argv[3].lower() == 'true'

    main(release_level, library, bump_prerelease)
