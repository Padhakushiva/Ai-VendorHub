on run argv
	set inputPath to POSIX file (item 1 of argv)
	set outputPath to item 2 of argv
	tell application "Microsoft Word"
		activate
		open inputPath
		save active document in outputPath as format PDF
		close active document saving no
	end tell
end run
