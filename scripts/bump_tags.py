import os
import sys
import semver
import subprocess

script_dir = os.path.dirname(os.path.abspath(__file__))
base_path = os.path.join(script_dir, '..', 'packages')


def get_latest_tag(package_path):
    try:
        # Use git to get the latest tag in the given path
        tags = subprocess.check_output(
            ["git", "tag"], cwd=package_path).decode().strip().split('\n')
        # Filter and sort the tags using semver, correcting the method name
        sorted_tags = sorted([tag for tag in tags if semver.VersionInfo.is_valid(
            tag)], key=semver.VersionInfo.parse)
        return sorted_tags[-1] if sorted_tags else None
    except subprocess.CalledProcessError:
        return None


def bump_version(version, release_level):
    ver_info = semver.VersionInfo.parse(version)
    if release_level == "major":
        return str(ver_info.bump_major())
    elif release_level == "minor":
        return str(ver_info.bump_minor())
    elif release_level == "patch":
        return str(ver_info.bump_patch())


def tag_new_version(package_path, new_version):
    try:
        subprocess.check_call(["git", "tag", new_version], cwd=package_path)
        subprocess.check_call(["git", "push", "--tags"], cwd=package_path)
    except subprocess.CalledProcessError:
        print(f"Failed to tag or push new version for {package_path}")


def main(release_level, library):
    if library:
        package_paths = [os.path.join(base_path, library)]
    else:
        package_paths = [os.path.join(base_path, name) for name in os.listdir(
            base_path) if os.path.isdir(os.path.join(base_path, name))]

    for package_path in package_paths:
        latest_tag = get_latest_tag(package_path)
        if latest_tag:
            new_version = bump_version(latest_tag, release_level)
            if new_version:
                tag_new_version(package_path, new_version)
                print(
                    f"Updated {os.path.basename(package_path)} to version {new_version}")
        else:
            print(
                f"No valid semver tags found in {os.path.basename(package_path)}")


if __name__ == "__main__":
    release_level = "patch"  # default value
    library = None

    if len(sys.argv) > 1:
        release_level = sys.argv[1]
    if len(sys.argv) > 2:
        library = sys.argv[2]

    main(release_level, library)
