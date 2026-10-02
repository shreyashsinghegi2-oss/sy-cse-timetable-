import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
        <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
          <div className="px-5 py-2">
            <Link href="/">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                Home
              </span>
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/about">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                About
              </span>
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/policies">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                Policies
              </span>
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/sell">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                Sell on StudentXchange
              </span>
            </Link>
          </div>
        </nav>
        <p className="mt-8 text-center text-base text-gray-400">
          &copy; 2025 StudentXchange. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
