#!/bin/bash

# Fixed path relative to where the script is executed
main_dir="./scripts/../packages"

# Change to the main directory
cd "$main_dir" || { echo "Failed to change directory to $main_dir"; exit 1; }

# Iterate over each subdirectory
for subdir in */ ; do
    # Remove the trailing slash to get the directory name
    subdir_name="${subdir%/}"

    # Form the tag name
    tag_name="@foo/${subdir_name}@0.0.1"

    # Create a git tag
    git tag "$tag_name"

    echo "Tagged $subdir_name with $tag_name"
done

# Optionally, push tags to remote
# git push --tags
