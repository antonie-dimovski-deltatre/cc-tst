#!/bin/bash

# Fixed path relative to where the script is executed
main_dir="./scripts/../packages"

# Change to the main directory
cd "$main_dir" || { echo "Failed to change directory to $main_dir"; exit 1; }

# Iterate over each subdirectory
for subdir in */ ; do
    # Remove the trailing slash to get the directory name
    subdir_name="${subdir%/}"

    # Replace spaces with underscores in the directory name for the tag
    safe_subdir_name=$(echo "$subdir_name" | tr ' ' '_')

    # Add and commit any changes in the subdirectory
    git add "$subdir_name/" --all
    git commit -m "Prepare for tagging $subdir_name"
    if [ $? -ne 0 ]; then
        echo "Commit failed for $subdir_name, possibly no changes to commit."
        git reset # Reset the staging area
        continue
    fi

    # Form the tag name, replacing spaces and adjusting format
    tag_name="bar@${safe_subdir_name}@0.0.1"

    # Create a git tag
    git tag "$tag_name"

    echo "Tagged $subdir_name with $tag_name"
done

echo "All subdirectories have been processed."
