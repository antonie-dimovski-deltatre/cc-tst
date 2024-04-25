#!/bin/bash

# Fixed path relative to where the script is executed
main_dir="../packages"

# Change to the main directory
cd "$main_dir" || { echo "Failed to change directory to $main_dir"; exit 1; }

# Iterate over each subdirectory
for subdir in */ ; do
    # Remove the trailing slash to get the directory name
    subdir_name="${subdir%/}"

    # Add and commit any changes in the subdirectory
    git add "$subdir_name/*"
    git commit -m "Prepare for tagging $subdir_name"

    # Form the tag name
    tag_name="@foo/${subdir_name}@0.0.1"

    # Create a git tag
    git tag "$tag_name"

    echo "Tagged $subdir_name with $tag_name"
done

echo "All subdirectories have been committed and tagged locally."
